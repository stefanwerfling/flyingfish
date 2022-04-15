import * as fs from 'fs';
import minimist from 'minimist';
import path from 'path';
import {Config} from './inc/Config/Config';
import {SshPort as SshPortDB} from './inc/Db/MariaDb/Entity/SshPort';
import {SshUser as SshUserDB} from './inc/Db/MariaDb/Entity/SshUser';
import {MariaDbHelper} from './inc/Db/MariaDb/MariaDbHelper';
import {SshServer} from './inc/ssh/SshServer';

/**
 * Main
 */
(async(): Promise<void> => {

    const argv = minimist(process.argv.slice(2));
    let configfile = path.join(__dirname, '/config.json');

    if (argv.config) {
        configfile = argv.config;
    }

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

    const tconfig = await Config.load(configfile);

    if (tconfig === null) {
        console.log(`Configloader is return empty config, please check your configfile: ${configfile}`);
        return;
    }

    // -----------------------------------------------------------------------------------------------------------------

    try {
        // MariaDb -----------------------------------------------------------------------------------------------------
        await MariaDbHelper.init({
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
        console.log('Error while connecting to the database', error);
        return;
    }

    // -----------------------------------------------------------------------------------------------------------------

    const server = SshServer.getInstance();
    server.listen();

})();