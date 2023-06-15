import {Args, DBHelper, Logger} from 'flyingfish_core';
import {SchemaFlyingFishArgsDdnsServer} from 'flyingfish_schemas';
import fs from 'fs';
import path from 'path';
import {Config} from './inc/Config/Config.js';
import {HttpServer} from './inc/Server/HttpServer.js';
import {v4 as uuid} from 'uuid';

/**
 * Main
 */
(async(): Promise<void> => {
    const argv = Args.get(SchemaFlyingFishArgsDdnsServer);
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

    // init logger
    Logger.getLogger();

    Logger.getLogger().info('Start FlyingFish DDNS Server ...');

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

            ],
            migrations: [
            ],
            migrationsRun: true,
            synchronize: true
        });
    } catch (error) {
        Logger.getLogger().error('Error while connecting to the database', error);
        return;
    }

    // start server ----------------------------------------------------------------------------------------------------

    const aport = 3000;
    const ssl_path = '';
    const session_secret = uuid();
    const session_cookie_path = '/';
    const session_cookie_max_age = 6000000;

    // -----------------------------------------------------------------------------------------------------------------

    const mServer = new HttpServer({
        realm: 'FlyingFish',
        port: aport,
        session: {
            secret: session_secret,
            ssl_path,
            cookie_path: session_cookie_path,
            max_age: session_cookie_max_age
        },
        routes: [

        ]
    });

    // listen, start express server
    await mServer.listen();
})();