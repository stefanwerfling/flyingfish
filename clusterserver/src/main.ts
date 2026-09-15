import {Args, Logger} from '@stefanwerfling/figtree';
import {
    ClusterMembership,
    ClusterTlsPeerTransport,
    ClusterWssPeerTransport,
    HubClusterPeerRoster,
    IClusterPeerTransport,
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
import {Config} from './inc/Config/Config.js';
import {HttpServer} from './inc/Server/HttpServer.js';
import {Cluster, ClusterNodeStatus} from './Routes/Main/Cluster.js';

const SESSION_MAX_AGE = 6000000;
const DEFAULT_PEER_PORT = 5336;
const DEFAULT_SYNC_INTERVAL_MS = 30000;

/**
 * Main
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

    Logger.getLogger().info('Start FlyingFish Cluster Server ...');

    // Node PKI (Cluster/Mesh epic 9.5.9): enroll + auto-renew this node's own
    // cluster certificate under the `cluster` CA purpose, BEFORE Hub registration
    // so the registration authenticates over mTLS with it. Optional and non-fatal
    // — without pki config the cluster node simply runs without an identity yet.
    const commonName = tConfig.pki?.commonName ?? `cluster@${os.hostname()}`;

    const status: ClusterNodeStatus = {
        nodeUid: '',
        purpose: PkiCaPurpose.cluster,
        commonName: commonName,
        enrolled: false
    };

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

            Logger.getLogger().info(`Cluster node PKI identity ready (nodeUid ${identity.nodeUid})`);
        } catch (error) {
            Logger.getLogger().error('Cluster node PKI enrollment failed (continuing without a node certificate)', error);
        }
    }

    // start server ----------------------------------------------------------------------------------------------------

    const aport = tConfig.clusterserver?.port ?? Config.DEFAULT_CLUSTERSERVER_PORT;

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
            new Cluster(status)
        ]
    });

    await mServer.setupAndListen();

    // Announce this node to the Hub registry. Optional: without registry config the
    // cluster node simply does not self-register. When a node certificate was
    // obtained above, the registration authenticates over mTLS with it.
    if (tConfig.registry) {
        await startHubRegistration(
            tConfig.registry.url,
            tConfig.registry.secret,
            buildClusterCapabilityManifest(`cluster@${os.hostname()}`),
            {identity: nodeIdentity}
        );
    }

    // Mesh peer transport (Cluster/Mesh epic 9.5.1): with a cluster node identity
    // and the Hub registry both present, bring up the authenticated peer transport,
    // announce our endpoint to the Hub roster and periodically sync — dialing the
    // other cluster nodes so every pair holds exactly one channel. Best-effort and
    // non-fatal: without either an identity or the registry the control part still
    // runs, just without the mesh.
    if (enrolledIdentity && tConfig.registry) {
        try {
            const transportOptions = {
                certificate: enrolledIdentity.certificate,
                privateKey: enrolledIdentity.privateKey,
                caChain: enrolledIdentity.chain
            };

            // 'wss' carries the peer channel over HTTPS/443 (NAT-/firewall-friendly);
            // 'tls' (default) uses the raw TCP-TLS transport. Both authenticate the
            // same way with the cluster node-cert.
            const transport: IClusterPeerTransport = tConfig.cluster?.transport === 'wss'
                ? new ClusterWssPeerTransport(transportOptions)
                : new ClusterTlsPeerTransport(transportOptions);

            const membership = new ClusterMembership(transport, enrolledIdentity.nodeUid);
            const peerPort = await membership.start(tConfig.cluster?.peerPort ?? DEFAULT_PEER_PORT);

            const roster = new HubClusterPeerRoster({
                hubUrl: tConfig.registry.url,
                selfNodeUid: enrolledIdentity.nodeUid,
                secret: tConfig.registry.secret
            });

            const advertiseHost = tConfig.cluster?.advertiseHost ?? os.hostname();
            const syncIntervalMs = tConfig.cluster?.syncIntervalMs ?? DEFAULT_SYNC_INTERVAL_MS;

            // Refresh our announcement (TTL) and re-sync the membership on a fixed
            // interval; both are best-effort so a transient Hub outage is not fatal.
            const syncOnce = async(): Promise<void> => {
                await roster.announce(advertiseHost, peerPort);
                await membership.sync(roster);
            };

            await syncOnce();

            setInterval((): void => {
                syncOnce().catch((error: unknown): void => {
                    Logger.getLogger().warn('Cluster mesh sync failed (will retry next interval)', error);
                });
            }, syncIntervalMs).unref();

            const transportName = tConfig.cluster?.transport === 'wss' ? 'wss' : 'tls';
            Logger.getLogger().info(`Cluster mesh transport (${transportName}) listening on peer port ${peerPort} (advertising ${advertiseHost})`);
        } catch (error) {
            Logger.getLogger().error('Cluster mesh transport failed to start (continuing without the mesh)', error);
        }
    }
})().catch((error: unknown): void => {
    // The logging framework may not be seated yet if boot fails this early,
    // so report to stderr and exit non-zero (lets the container restart).
    console.error('FlyingFish cluster server failed to start:', error);
    process.exit(1);
});