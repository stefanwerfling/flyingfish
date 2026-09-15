import {Args, Logger} from '@stefanwerfling/figtree';
import {
    ClusterDatapath,
    ClusterMembership,
    ClusterPeerInfo,
    ClusterQuicPeerTransport,
    ClusterRouteTable,
    ClusterTlsPeerTransport,
    ClusterWssPeerTransport,
    HubClusterPeerRoster,
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

            status.transport = transportName;

            const membership = new ClusterMembership(transport, enrolledIdentity.nodeUid);
            const routeTable = new ClusterRouteTable();

            status.peers = (): string[] => membership.peers();

            // Bring up the TUN device + L3 datapath. Optional: without the native
            // binding (or CAP_NET_ADMIN) the node still runs the mesh, just without
            // packet forwarding.
            const tunBinding = TunBindingLoader.load();

            if (tunBinding !== null && overlayIp.length > 0) {
                try {
                    const tunName = tConfig.cluster?.tunName ?? DEFAULT_TUN_NAME;
                    const netmask = tConfig.cluster?.overlayNetmask ?? DEFAULT_OVERLAY_NETMASK;
                    const nativeTun = tunBinding.TunDevice.open(tunName, overlayIp, netmask);
                    const tun = new NativeTunDevice(nativeTun);

                    const datapath = new ClusterDatapath(tun, routeTable, (nodeUid) => membership.getChannel(nodeUid));
                    membership.onPeer((channel) => datapath.attachPeer(channel));
                    datapath.start();

                    status.tunActive = true;
                    status.tunIfName = nativeTun.ifName;

                    Logger.getLogger().info(`Cluster datapath TUN ${nativeTun.ifName} up (overlay ${overlayIp})`);
                } catch (error) {
                    Logger.getLogger().error('Cluster datapath TUN device failed to open (mesh runs without L3 forwarding)', error);
                }
            } else {
                Logger.getLogger().warn('Cluster datapath running without a TUN device (no binding or no overlay IP)');
            }

            const peerPort = await membership.start(tConfig.cluster?.peerPort ?? DEFAULT_PEER_PORT);

            const roster = new HubClusterPeerRoster({
                hubUrl: tConfig.registry.url,
                selfNodeUid: enrolledIdentity.nodeUid,
                secret: tConfig.registry.secret
            });

            const advertiseHost = tConfig.cluster?.advertiseHost ?? os.hostname();
            const syncIntervalMs = tConfig.cluster?.syncIntervalMs ?? DEFAULT_SYNC_INTERVAL_MS;

            // Announce our endpoint + overlay IP, refresh the route table from the
            // roster, then dial the un-connected peers. Best-effort each interval.
            const syncOnce = async(): Promise<void> => {
                await roster.announce(advertiseHost, peerPort, overlayIp.length > 0 ? overlayIp : undefined);

                const peers: ClusterPeerInfo[] = await roster.list();
                routeTable.applyRoster(peers);

                await membership.sync({list: (): Promise<ClusterPeerInfo[]> => Promise.resolve(peers)});
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