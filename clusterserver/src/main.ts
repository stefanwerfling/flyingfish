import {Args, Logger} from '@stefanwerfling/figtree';
import {
    PkiBootstrapSocketClient,
    PkiCaPurpose,
    PkiClientIdentity,
    PkiNodeClient,
    PkiNodeEnroller,
    PkiNodeFileStore,
    PkiNodeHttpTransport,
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

    if (tConfig.pki) {
        try {
            const store = new PkiNodeFileStore(
                tConfig.pki.storeDir ?? tConfig.flyingfish_libpath ?? Config.DEFAULT_FF_DIR
            );

            const bootstrapSocket = tConfig.pki.bootstrapSocket;
            const bootstrapTokenProvider = bootstrapSocket
                ? (): Promise<string> => new PkiBootstrapSocketClient(bootstrapSocket).fetchToken()
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
})().catch((error: unknown): void => {
    // The logging framework may not be seated yet if boot fails this early,
    // so report to stderr and exit non-zero (lets the container restart).
    console.error('FlyingFish cluster server failed to start:', error);
    process.exit(1);
});