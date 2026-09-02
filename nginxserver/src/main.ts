import {Args, DBHelper, Logger} from 'figtree';
import {
    CredentialDB,
    CredentialLocationDB,
    CredentialUserDB,
    DBService,
    IpBlacklistDB,
    IpLocationDB,
    IpWhitelistDB
} from 'flyingfish_core';
import {SchemaDefaultArgs} from 'figtree-schemas';
import * as fs from 'fs';
import path from 'path';
import {Config} from './inc/Config/Config.js';
import {ControlHttpServer} from './inc/Server/ControlHttpServer.js';
import {NginxProcessAgent} from './inc/Nginx/NginxProcessAgent.js';
import {Control} from './Routes/Control.js';

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

    Logger.getLogger().info('Start FlyingFish Nginx control service ...');

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
                CredentialDB,
                CredentialLocationDB,
                CredentialUserDB,
                IpBlacklistDB,
                IpLocationDB,
                IpWhitelistDB
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

    // Start the local nginx process and the control server the backend drives.
    // (The njs access/auth control routes are wired in a later slice.)
    const nginx = tConfig.nginx!;
    const agent = new NginxProcessAgent(nginx.config, nginx.prefix);

    agent.start();

    const secret = nginx.secret ?? '';

    if (secret === '') {
        Logger.getLogger().warn(
            'Nginx control: no nginx.secret configured — the control API will reject every call.'
        );
    }

    const server = new ControlHttpServer(Config.DEFAULT_CONTROL_PORT, [
        new Control(agent, secret)
    ]);

    await server.setupAndListen();

    Logger.getLogger().info('FlyingFish Nginx control service listening on port %d', Config.DEFAULT_CONTROL_PORT);
})().catch((error: unknown): void => {
    // The logging framework may not be seated yet if boot fails this early,
    // so report to stderr and exit non-zero (lets the container restart).
    console.error('FlyingFish Nginx control service failed to start:', error);
    process.exit(1);
});