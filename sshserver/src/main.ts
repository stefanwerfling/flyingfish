import {Args, DBHelper, Logger} from 'flyingfish_core';
import {SchemaFlyingFishArgsSshServer} from 'flyingfish_schemas';
import * as fs from 'fs';
import path from 'path';
import {Config} from './inc/Config/Config.js';
import {SshPort as SshPortDB} from './inc/Db/MariaDb/Entity/SshPort.js';
import {SshUser as SshUserDB} from './inc/Db/MariaDb/Entity/SshUser.js';
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
            migrations: [
            ],
            migrationsRun: true,
            synchronize: true
        });

    } catch (error) {
        Logger.getLogger().error('Error while connecting to the database', error);
        return;
    }

    // -----------------------------------------------------------------------------------------------------------------

    const server = await SshServer.getInstance();
    server.listen();

})();