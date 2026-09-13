import {Args, DBHelper, Logger} from 'figtree';
import {
    CaCertificateDB,
    DBService,
    EnrollmentRequestDB,
    IssuedCertificateDB,
    PkiBootstrapSocketServer,
    PkiBootstrapTokenStore,
    PkiCaPurpose,
    PkiEnrollmentService,
    startHubRegistration
} from 'flyingfish_core';
import {SchemaDefaultArgs} from 'figtree-schemas';
import {buildPkiCapabilityManifest} from 'flyingfish_schemas';
import * as fs from 'fs';
import os from 'os';
import path from 'path';
import {v4 as uuid} from 'uuid';
import {Config} from './inc/Config/Config.js';
import {HttpServer} from './inc/Server/HttpServer.js';
import {PkiStore} from './inc/Pki/PkiStore.js';
import {Pki} from './Routes/Main/Pki.js';

const DEFAULT_ORGANIZATION = 'FlyingFish';

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

    Logger.getLogger().info('Start FlyingFish PKI Server ...');

    // -----------------------------------------------------------------------------------------------------------------

    try {
        await DBHelper.init({
            type: 'mysql',
            host: tConfig.db.mysql.host,
            port: tConfig.db.mysql.port,
            username: tConfig.db.mysql.username,
            password: tConfig.db.mysql.password,
            database: tConfig.db.mysql.database,
            entities: [
                CaCertificateDB,
                IssuedCertificateDB,
                EnrollmentRequestDB
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

    // load (or create on first boot) the CA tree and seat the enrollment service -------------------------------------

    const store = new PkiStore();
    const organization = tConfig.pkiserver?.organization ?? DEFAULT_ORGANIZATION;
    const tree = await store.loadOrCreate(organization);

    const tokens = new PkiBootstrapTokenStore();
    const service = new PkiEnrollmentService(tree, tokens);

    // Export the CA pool (root + purpose intermediates) to a shared file so the
    // Hub can seed its mTLS client CA by reading it — no boot-time HTTP dependency
    // on the pkiserver, which sidesteps the backend<->pkiserver ordering cycle
    // (9.4 mTLS). Written on every boot; the CA is stable across restarts.
    if (tConfig.pkiserver?.caExportFile) {
        await store.exportCaPool(service.getCaPool(), tConfig.pkiserver.caExportFile);

        Logger.getLogger().info(`PKI CA pool exported to ${tConfig.pkiserver.caExportFile}`);
    }

    // Local bootstrap-token vending over a unix socket (9.4.3-D): co-located parts
    // fetch a single-use, short-TTL, auto-approve service token here (trust by
    // co-location) and then enroll over HTTP. Optional — without a socket path the
    // pkiserver just does not vend bootstrap tokens.
    const BOOTSTRAP_TOKEN_TTL_MS = 60000;

    if (tConfig.pkiserver?.bootstrapSocket) {
        const bootstrapServer = new PkiBootstrapSocketServer(
            tConfig.pkiserver.bootstrapSocket,
            (): string => tokens.issue({
                purpose: PkiCaPurpose.service,
                autoApprove: true,
                ttlMs: BOOTSTRAP_TOKEN_TTL_MS
            }).token
        );

        await bootstrapServer.listen();

        Logger.getLogger().info(`PKI bootstrap socket listening on ${tConfig.pkiserver.bootstrapSocket}`);
    }

    // start server ----------------------------------------------------------------------------------------------------

    const aport = tConfig.pkiserver?.port ?? Config.DEFAULT_PKISERVER_PORT;
    const ssl_path = '';
    const session_secret = uuid();
    const session_cookie_path = '/';
    const session_cookie_max_age = 6000000;

    const mServer = new HttpServer({
        realm: 'FlyingFish',
        port: aport,
        session: {
            secret: session_secret,
            ssl_path: ssl_path,
            cookie_path: session_cookie_path,
            max_age: session_cookie_max_age
        },
        routes: [
            new Pki(service, store, tConfig.pkiserver?.caExportFile)
        ]
    });

    // set up middleware/routes and start the express server (figtree splits
    // setup from listen).
    await mServer.setupAndListen();

    // Announce this part to the Hub registry (v2 modular architecture). Optional:
    // without registry config the PKI server simply does not self-register.
    if (tConfig.registry) {
        await startHubRegistration(
            tConfig.registry.url,
            tConfig.registry.secret,
            buildPkiCapabilityManifest(`pki@${os.hostname()}`)
        );
    }
})().catch((error: unknown): void => {
    // The logging framework may not be seated yet if boot fails this early,
    // so report to stderr and exit non-zero (lets the container restart).
    console.error('FlyingFish PKI server failed to start:', error);
    process.exit(1);
});