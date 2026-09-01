import {Args, DBHelper, Logger, RedisClient, RedisSubscribe} from 'figtree';
import {DBService, SshPortDB, SshUserDB, registerWithHub} from 'flyingfish_core';
import {SchemaFlyingFishArgsSshServer, buildSshCapabilityManifest} from 'flyingfish_schemas';
import * as fs from 'fs';
import os from 'os';
import path from 'path';
import {Config} from './inc/Config/Config.js';
import {SshConfigChangedChannel} from './inc/Ipc/SshConfigChangedChannel.js';
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

    // Redis IPC subscriber (phase 3): react to backend SSH config changes so
    // long-lived tunnels are reloaded. Optional - without a Redis URL the ssh
    // server just keeps relying on the shared DB (read on connect).
    if (tconfig.db.redis && tconfig.db.redis.url) {
        try {
            const redisSubscribe = RedisSubscribe.getInstance({
                url: tconfig.db.redis.url,
                password: tconfig.db.redis.password
            }, true);

            const redisClient = RedisClient.getInstance();
            await redisClient.connect();

            await redisSubscribe.connect();
            await redisSubscribe.registerChannels([
                new SshConfigChangedChannel(server)
            ]);

            Logger.getLogger().info('SSH config-change IPC subscriber connected.');
        } catch (error) {
            // Non-fatal: the ssh server must still serve tunnels without Redis.
            Logger.getLogger().error('Error while connecting to the mem-database', error);
        }
    }

    server.listen();

    // Announce this part to the Hub registry (v2 modular architecture). Optional:
    // without registry config the SSH server simply does not self-register.
    if (tconfig.registry) {
        await registerWithHub(
            tconfig.registry.url,
            tconfig.registry.secret,
            buildSshCapabilityManifest(`ssh@${os.hostname()}`)
        );
    }

})().catch((error: unknown): void => {
    // The logging framework may not be seated yet if boot fails this early,
    // so report to stderr and exit non-zero (lets the container restart).
    console.error('FlyingFish SSH server failed to start:', error);
    process.exit(1);
});