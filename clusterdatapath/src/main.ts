import {Args, Logger} from '@stefanwerfling/figtree';
import {
    ClusterDatapath,
    ClusterL4Proto,
    ClusterL4Route,
    ClusterL4RouteHandle,
    ClusterL4RouteReconciler,
    ClusterL4TcpDialer,
    ClusterL4TcpListener,
    ClusterL4Tunnel,
    ClusterMembership,
    ClusterMuxKind,
    ClusterPeerInfo,
    ClusterPeerMux,
    ClusterQuicPeerTransport,
    ClusterRouteTable,
    ClusterTlsPeerTransport,
    ClusterWssPeerTransport,
    HubClusterL4RouteProvider,
    HubClusterPeerRoster,
    IClusterMessageChannel,
    IClusterL4Stream,
    IClusterPeerTransport,
    NativeTunDevice,
    PkiBootstrapSocketClient,
    PkiCaPurpose,
    PkiClientIdentity,
    PkiNodeClient,
    PkiNodeEnroller,
    PkiNodeFileStore,
    PkiNodeHttpTransport,
    PkiNodeIdentity,
    startHubRegistration
} from 'flyingfish_core';
import {SchemaDefaultArgs} from 'figtree-schemas';
import {buildClusterCapabilityManifest} from 'flyingfish_schemas';
import * as fs from 'fs';
import os from 'os';
import path from 'path';
import {v4 as uuid} from 'uuid';
import {QuicBindingLoader} from './inc/Cluster/QuicBindingLoader.js';
import {TunBindingLoader} from './inc/Cluster/TunBindingLoader.js';
import {Config} from './inc/Config/Config.js';
import {HttpServer} from './inc/Server/HttpServer.js';
import {Datapath, DatapathNodeStatus} from './Routes/Main/Datapath.js';

const SESSION_MAX_AGE = 6000000;
const DEFAULT_PEER_PORT = 5336;
const DEFAULT_SYNC_INTERVAL_MS = 30000;
const DEFAULT_TUN_NAME = 'ff0';
const DEFAULT_OVERLAY_NETMASK = '255.255.0.0';

/**
 * Main — the cluster data-plane node: its own PKI cluster identity, mesh peer
 * transport, and (in its privileged container) a TUN device the ClusterDatapath
 * bridges to the peer channels for L3 forwarding.
 */
(async(): Promise<void> => {
    const argv = Args.get(SchemaDefaultArgs);
    let configfile = null;

    if (argv.config) {
        configfile = argv.config;

        try {
            if (!fs.existsSync(configfile)) {
                console.log(`Config not found: ${configfile}, exit.`);
                return;
            }
        } catch (err) {
            console.log(`Config is not load: ${configfile}, exit.`);
            console.error(err);
            return;
        }
    } else {
        const defaultConfig = path.join(path.resolve(), `/${Config.DEFAULT_CONFIG_FILE}`);

        if (fs.existsSync(defaultConfig)) {
            console.log(`Found and use setup config: ${defaultConfig} ....`);
            configfile = defaultConfig;
        }
    }

    let useEnv = false;

    if (argv.envargs && argv.envargs === '1') {
        useEnv = true;
    }

    const tConfig = await Config.getInstance().load(configfile, useEnv);

    if (tConfig === null) {
        console.log(`Configloader is return empty config, please check your configfile: ${configfile}`);
        return;
    }

    // -----------------------------------------------------------------------------------------------------------------

    Logger.getLogger();

    Logger.getLogger().info('Start FlyingFish Cluster Datapath ...');

    const commonName = tConfig.pki?.commonName ?? `datapath@${os.hostname()}`;
    const overlayIp = tConfig.cluster?.overlayIp ?? '';

    const status: DatapathNodeStatus = {
        nodeUid: '',
        overlayIp: overlayIp,
        transport: tConfig.cluster?.transport ?? 'tls',
        enrolled: false,
        tunActive: false,
        tunIfName: '',
        l4Tunnels: 0,
        peers: (): string[] => []
    };

    // Node PKI (Cluster/Mesh epic 9.5.9): enroll + auto-renew this node's own
    // cluster certificate under the `cluster` CA purpose — its verifiable mesh
    // identity. Optional and non-fatal.
    let nodeIdentity: PkiClientIdentity | undefined;
    let enrolledIdentity: PkiNodeIdentity | undefined;

    if (tConfig.pki) {
        try {
            const store = new PkiNodeFileStore(
                tConfig.pki.storeDir ?? tConfig.flyingfish_libpath ?? Config.DEFAULT_FF_DIR
            );

            const bootstrapSocket = tConfig.pki.bootstrapSocket;
            const bootstrapTokenProvider = bootstrapSocket
                ? (purpose: PkiCaPurpose): Promise<string> => new PkiBootstrapSocketClient(bootstrapSocket).fetchToken(purpose)
                : undefined;

            const enroller = new PkiNodeEnroller(
                new PkiNodeClient(new PkiNodeHttpTransport(tConfig.pki.url)),
                store,
                {
                    bootstrapToken: tConfig.pki.bootstrapToken,
                    bootstrapTokenProvider: bootstrapTokenProvider,
                    purpose: PkiCaPurpose.cluster,
                    commonName: commonName
                }
            );

            const identity = await enroller.ensure();

            enrolledIdentity = identity;
            nodeIdentity = {cert: identity.certificate, key: identity.privateKey};
            status.nodeUid = identity.nodeUid;
            status.enrolled = true;

            Logger.getLogger().info(`Cluster datapath PKI identity ready (nodeUid ${identity.nodeUid})`);
        } catch (error) {
            Logger.getLogger().error('Cluster datapath PKI enrollment failed (continuing without a node certificate)', error);
        }
    }

    // start server ----------------------------------------------------------------------------------------------------

    const aport = tConfig.clusterdatapath?.port ?? Config.DEFAULT_CLUSTERDATAPATH_PORT;

    const mServer = new HttpServer({
        realm: 'FlyingFish',
        port: aport,
        session: {
            secret: uuid(),
            ssl_path: '',
            cookie_path: '/',
            max_age: SESSION_MAX_AGE
        },
        routes: [
            new Datapath(status)
        ]
    });

    await mServer.setupAndListen();

    // Announce this node to the Hub registry (part list). Optional.
    if (tConfig.registry) {
        await startHubRegistration(
            tConfig.registry.url,
            tConfig.registry.secret,
            buildClusterCapabilityManifest(`datapath@${os.hostname()}`),
            {identity: nodeIdentity}
        );
    }

    // Mesh data plane (Cluster/Mesh epic 9.5.1): with a cluster identity and the
    // Hub registry, bring up the peer transport, the L3 datapath over a TUN device,
    // and the announce/sync loop that keeps the roster + routes current.
    if (enrolledIdentity && tConfig.registry) {
        try {
            const transportOptions = {
                certificate: enrolledIdentity.certificate,
                privateKey: enrolledIdentity.privateKey,
                caChain: enrolledIdentity.chain
            };

            let transportName = tConfig.cluster?.transport ?? 'tls';
            let transport: IClusterPeerTransport;

            if (transportName === 'quic') {
                const quicBinding = QuicBindingLoader.load();

                if (quicBinding === null) {
                    Logger.getLogger().warn('QUIC binding unavailable — falling back to the TLS peer transport');
                    transportName = 'tls';
                    transport = new ClusterTlsPeerTransport(transportOptions);
                } else {
                    transport = new ClusterQuicPeerTransport(transportOptions, quicBinding);
                }
            } else if (transportName === 'wss') {
                transport = new ClusterWssPeerTransport(transportOptions);
            } else {
                transportName = 'tls';
                transport = new ClusterTlsPeerTransport(transportOptions);
            }

            // eslint-disable-next-line require-atomic-updates -- single-run boot, no concurrent status writer yet
            status.transport = transportName;

            const membership = new ClusterMembership(transport, enrolledIdentity.nodeUid);
            const routeTable = new ClusterRouteTable();

            status.peers = (): string[] => membership.peers();

            // Each peer link is multiplexed (Cluster/Mesh epic 9.5.2): L3 packets and
            // L4 tunnel streams share the one authenticated channel. The datapath
            // sends outbound packets over the peer's L3 mux sub-channel, resolved here.
            const packetByNode = new Map<string, IClusterMessageChannel>();

            // Bring up the TUN device + L3 datapath. Optional: without the native
            // binding (or CAP_NET_ADMIN) the node still runs the mesh — and L4
            // tunnels, which need no TUN — just without L3 packet forwarding.
            let datapath: ClusterDatapath | undefined;
            const tunBinding = TunBindingLoader.load();

            if (tunBinding !== null && overlayIp.length > 0) {
                try {
                    const tunName = tConfig.cluster?.tunName ?? DEFAULT_TUN_NAME;
                    const netmask = tConfig.cluster?.overlayNetmask ?? DEFAULT_OVERLAY_NETMASK;
                    const nativeTun = tunBinding.TunDevice.open(tunName, overlayIp, netmask);
                    const tun = new NativeTunDevice(nativeTun);

                    datapath = new ClusterDatapath(tun, routeTable, (nodeUid) => packetByNode.get(nodeUid));
                    datapath.start();

                    // eslint-disable-next-line require-atomic-updates -- single-run boot, no concurrent status writer yet
                    status.tunActive = true;
                    // eslint-disable-next-line require-atomic-updates -- single-run boot, no concurrent status writer yet
                    status.tunIfName = nativeTun.ifName;

                    Logger.getLogger().info(`Cluster datapath TUN ${nativeTun.ifName} up (overlay ${overlayIp})`);
                } catch (error) {
                    Logger.getLogger().error('Cluster datapath TUN device failed to open (mesh runs without L3 forwarding)', error);
                }
            } else {
                Logger.getLogger().warn('Cluster datapath running without a TUN device (no binding or no overlay IP)');
            }

            // L4 tunnel coordinator (Cluster/Mesh epic 9.5.2): one session per peer,
            // dialing egress targets over TCP.
            const l4Tunnel = new ClusterL4Tunnel(enrolledIdentity.nodeUid, new ClusterL4TcpDialer());

            // Wire every peer channel (set before start so none is missed): multiplex
            // it, feed the L3 sub-channel to the datapath and the L4 sub-channel to the
            // tunnel, and tear both down when the link closes.
            membership.onPeer((channel) => {
                const nodeUid = channel.identity.nodeUid;
                const mux = new ClusterPeerMux(channel);
                const packetChannel = mux.channel(ClusterMuxKind.Packet);

                packetByNode.set(nodeUid, packetChannel);

                if (datapath !== undefined) {
                    datapath.attachPeer(packetChannel);
                }

                l4Tunnel.addPeer(nodeUid, mux.channel(ClusterMuxKind.L4));

                mux.onClose((): void => {
                    packetByNode.delete(nodeUid);
                    l4Tunnel.removePeer(nodeUid);
                });
            });

            // L4 routes (Cluster/Mesh epic 9.5.4): this node's configured tunnels become
            // cluster-wide routes it owns and publishes; every node syncs the full set
            // and the reconciler binds/unbinds ingress listeners to match — dynamic,
            // cluster-managed routing (no restart to add/remove a service).
            const localRoutes: ClusterL4Route[] = (tConfig.tunnels ?? []).map((rule): ClusterL4Route => ({
                id: `${enrolledIdentity!.nodeUid}:${rule.listenHost ?? '*'}:${rule.listenPort}`,
                proto: (rule.proto ?? 'tcp').toLowerCase() === 'udp' ? ClusterL4Proto.Udp : ClusterL4Proto.Tcp,
                ingressNodeUid: enrolledIdentity!.nodeUid,
                listenHost: rule.listenHost,
                listenPort: rule.listenPort,
                egressNodeUid: rule.egressNodeUid,
                targetHost: rule.targetHost,
                targetPort: rule.targetPort,
                proxyProtocol: rule.proxyProtocol
            }));

            // Bind one route's ingress listener. TCP only for now; a UDP route is
            // skipped (the frame/engine already carry the proto).
            const bindRoute = async(route: ClusterL4Route): Promise<ClusterL4RouteHandle | null> => {
                if (route.proto === ClusterL4Proto.Udp) {
                    Logger.getLogger().warn(`L4 route ${route.id} skipped: UDP tunnels are not yet supported`);

                    return null;
                }

                const target = {proto: ClusterL4Proto.Tcp, host: route.targetHost, port: route.targetPort};
                const listener = new ClusterL4TcpListener((stream: IClusterL4Stream, endpoints): void => {
                    // Preserve the client IP (9.5.3): carry the socket endpoints when the
                    // route asks for it, so the egress emits a PROXY protocol v2 header.
                    const clientInfo = route.proxyProtocol === true && endpoints !== undefined
                        ? {
                            sourceHost: endpoints.source.host,
                            sourcePort: endpoints.source.port,
                            destHost: endpoints.destination.host,
                            destPort: endpoints.destination.port
                        }
                        : undefined;

                    l4Tunnel.open(route.egressNodeUid, target, stream, clientInfo);
                });

                try {
                    const boundPort = await listener.listen(route.listenPort, route.listenHost);

                    Logger.getLogger().info(`L4 route ${route.id} ${route.listenHost ?? '0.0.0.0'}:${boundPort} → ${route.egressNodeUid} (${route.targetHost}:${route.targetPort})`);

                    return {close: async(): Promise<void> => listener.close()};
                } catch (error) {
                    Logger.getLogger().error(`L4 route ${route.id} failed to bind port ${route.listenPort}`, error);

                    return null;
                }
            };

            const routeProvider = new HubClusterL4RouteProvider({
                hubUrl: tConfig.registry.url,
                selfNodeUid: enrolledIdentity.nodeUid,
                secret: tConfig.registry.secret
            });
            const routeReconciler = new ClusterL4RouteReconciler(enrolledIdentity.nodeUid, bindRoute);

            const peerPort = await membership.start(tConfig.cluster?.peerPort ?? DEFAULT_PEER_PORT);

            const roster = new HubClusterPeerRoster({
                hubUrl: tConfig.registry.url,
                selfNodeUid: enrolledIdentity.nodeUid,
                secret: tConfig.registry.secret
            });

            const advertiseHost = tConfig.cluster?.advertiseHost ?? os.hostname();
            const syncIntervalMs = tConfig.cluster?.syncIntervalMs ?? DEFAULT_SYNC_INTERVAL_MS;

            // Announce our endpoint + overlay IP, refresh the route table from the
            // roster, dial the un-connected peers, then publish this node's L4 routes
            // and reconcile ingress listeners against the cluster-wide set. Best-effort
            // each interval.
            const syncOnce = async(): Promise<void> => {
                await roster.announce(advertiseHost, peerPort, overlayIp.length > 0 ? overlayIp : undefined);

                const peers: ClusterPeerInfo[] = await roster.list();
                routeTable.applyRoster(peers);

                await membership.sync({list: (): Promise<ClusterPeerInfo[]> => Promise.resolve(peers)});

                await routeProvider.publish(localRoutes);
                await routeReconciler.reconcile(await routeProvider.list());
                status.l4Tunnels = routeReconciler.activeCount();
            };

            await syncOnce();

            setInterval((): void => {
                syncOnce().catch((error: unknown): void => {
                    Logger.getLogger().warn('Cluster datapath sync failed (will retry next interval)', error);
                });
            }, syncIntervalMs).unref();

            Logger.getLogger().info(`Cluster datapath mesh (${transportName}) listening on peer port ${peerPort} (advertising ${advertiseHost})`);
        } catch (error) {
            Logger.getLogger().error('Cluster datapath mesh failed to start (continuing without the mesh)', error);
        }
    }
})().catch((error: unknown): void => {
    // The logging framework may not be seated yet if boot fails this early,
    // so report to stderr and exit non-zero (lets the container restart).
    console.error('FlyingFish cluster datapath failed to start:', error);
    process.exit(1);
});