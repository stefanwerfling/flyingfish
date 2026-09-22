import {Args, DBHelper, Logger} from '@stefanwerfling/figtree';
import {
    DBService,
    PkiBootstrapSocketClient,
    PkiCaPurpose,
    PkiClientIdentity,
    PkiNodeClient,
    PkiNodeEnroller,
    PkiNodeFileStore,
    PkiNodeHttpTransport,
    SshPortDB,
    SshUserDB,
    startHubRegistration
} from 'flyingfish_core';
import {SchemaFlyingFishArgsSshServer, buildSshCapabilityManifest} from 'flyingfish_schemas';
import * as fs from 'fs';
import os from 'os';
import path from 'path';
import {Config} from './inc/Config/Config.js';
import {SshConfigPoller} from './inc/Ipc/SshConfigPoller.js';
import {SshServer} from './inc/Ssh/SshServer.js';

/**
 * Main
 */
(async(): Promise<void> => {
    const argv = Args.get(SchemaFlyingFishArgsSshServer);
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

    const tconfig = await Config.getInstance().load(configfile, useEnv);

    if (tconfig === null) {
        console.log(`Configloader is return empty config, please check your configfile: ${configfile}`);
        return;
    }

    // -----------------------------------------------------------------------------------------------------------------

    // init logger
    Logger.getLogger();

    Logger.getLogger().info('Start FlyingFish SSH Server ...');

    // -----------------------------------------------------------------------------------------------------------------

    try {
        // MariaDb -----------------------------------------------------------------------------------------------------
        await DBHelper.init({
            type: 'mysql',
            // 'localhost',
            host: tconfig.db.mysql.host,
            // 3306,
            port: tconfig.db.mysql.port,
            // 'root',
            username: tconfig.db.mysql.username,
            // 'test',
            password: tconfig.db.mysql.password,
            // 'ccc',
            database: tconfig.db.mysql.database,
            entities: [
                SshPortDB,
                SshUserDB
            ],
            // This service is a consumer of the shared database; the backend owns
            // the schema and runs the migrations.
            migrations: [],
            migrationsRun: false,
            synchronize: false
        });

        // Cache the initialized DataSource for the flyingfish_core services.
        await DBService.connect();
    } catch (error) {
        Logger.getLogger().error('Error while connecting to the database', error);
        return;
    }

    // -----------------------------------------------------------------------------------------------------------------

    const server = await SshServer.getInstance({
        hostKeysPath: tconfig.flyingfish_sshpath
    });

    server.listen();

    // SSH config-change poller: react to backend SSH config changes so long-lived
    // tunnels are reloaded (saved) or closed (deleted). Polls the backend over HTTP
    // with the registry secret - replaces the former Redis IPC subscriber. Optional:
    // without registry config the ssh server just keeps relying on the shared DB
    // (read on (re)connect).
    if (tconfig.registry && tconfig.registry.url && tconfig.registry.secret) {
        new SshConfigPoller(
            tconfig.registry.url,
            tconfig.registry.secret,
            server
        ).start();

        Logger.getLogger().info('SSH config-change HTTP poller started.');
    }

    // Node PKI (v2 own-PKI epic 9.4): opt-in enroll + auto-renew of this part's
    // own service certificate, BEFORE Hub registration so the registration can
    // authenticate over mTLS with it. Optional and non-fatal — without pki config
    // the SSH server simply runs without a node certificate.
    let nodeIdentity: PkiClientIdentity | undefined;

    if (tconfig.pki) {
        try {
            const store = new PkiNodeFileStore(
                tconfig.pki.storeDir ?? tconfig.flyingfish_libpath ?? Config.DEFAULT_FF_DIR
            );

            const bootstrapSocket = tconfig.pki.bootstrapSocket;
            const bootstrapTokenProvider = bootstrapSocket
                ? (purpose: PkiCaPurpose): Promise<string> => new PkiBootstrapSocketClient(bootstrapSocket).fetchToken(purpose)
                : undefined;

            const enroller = new PkiNodeEnroller(
                new PkiNodeClient(new PkiNodeHttpTransport(tconfig.pki.url)),
                store,
                {
                    bootstrapToken: tconfig.pki.bootstrapToken,
                    bootstrapTokenProvider: bootstrapTokenProvider,
                    purpose: PkiCaPurpose.service,
                    commonName: tconfig.pki.commonName ?? `ssh@${os.hostname()}`
                }
            );

            const identity = await enroller.ensure();

            nodeIdentity = {cert: identity.certificate, key: identity.privateKey};

            Logger.getLogger().info(`Node PKI identity ready (nodeUid ${identity.nodeUid})`);
        } catch (error) {
            Logger.getLogger().error('Node PKI enrollment failed (continuing without a node certificate)', error);
        }
    }

    // Announce this part to the Hub registry (v2 modular architecture). Optional:
    // without registry config the SSH server simply does not self-register. When a
    // node certificate was obtained above, the registration authenticates over
    // mTLS with it instead of relying on the shared secret alone.
    if (tconfig.registry) {
        await startHubRegistration(
            tconfig.registry.url,
            tconfig.registry.secret,
            buildSshCapabilityManifest(`ssh@${os.hostname()}`),
            {identity: nodeIdentity}
        );
    }

})().catch((error: unknown): void => {
    // The logging framework may not be seated yet if boot fails this early,
    // so report to stderr and exit non-zero (lets the container restart).
    console.error('FlyingFish SSH server failed to start:', error);
    process.exit(1);
});