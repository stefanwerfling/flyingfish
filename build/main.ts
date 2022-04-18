import minimist from 'minimist';
import * as path from 'path';
import * as fs from 'fs';
import {Domain as DomainController} from './app/Main/Domain';
import {Login as LoginController} from './app/Main/Login';
import {User as UserController} from './app/Main/User';
import {Config} from './inc/Config/Config';
import {v4 as uuid} from 'uuid';
import * as bodyParser from 'body-parser';
import session from 'express-session';
import {DBSetup} from './inc/Db/MariaDb/DBSetup';
import {NginxDomain as NginxDomainDB} from './inc/Db/MariaDb/Entity/NginxDomain';
import {NginxHttp as NginxHttpDB} from './inc/Db/MariaDb/Entity/NginxHttp';
import {NginxListen as NginxListenDB} from './inc/Db/MariaDb/Entity/NginxListen';
import {NginxStream as NginxStreamDB} from './inc/Db/MariaDb/Entity/NginxStream';
import {SshPort as SshPortDB} from './inc/Db/MariaDb/Entity/SshPort';
import {SshUser as SshUserDB} from './inc/Db/MariaDb/Entity/SshUser';
import {User as UserDB} from './inc/Db/MariaDb/Entity/User';
import {MariaDbHelper} from './inc/Db/MariaDb/MariaDbHelper';
import {NginxServer} from './inc/Nginx/NginxServer';
import {Server} from './inc/Server/Server';
import cookieParser from 'cookie-parser';
import {NginxService} from './inc/Service/NginxService';

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
                UserDB,
                NginxListenDB,
                NginxDomainDB,
                NginxStreamDB,
                NginxHttpDB,
                SshPortDB,
                SshUserDB
            ],
            migrations: [
            ],
            migrationsRun: true,
            synchronize: true
        });

        // db setup first init
        await DBSetup.firstInit();
    } catch (error) {
        console.log('Error while connecting to the database', error);
        return;
    }

    // start server ----------------------------------------------------------------------------------------------------

    let aport = 3000;
    let public_dir = '';
    let session_secret = uuid();
    let session_cookie_path = '/';
    let session_cookie_max_age = 6000000;

    if (tconfig.httpserver) {
        if (tconfig.httpserver.port) {
            aport = tconfig.httpserver.port;
        }

        if (tconfig.httpserver.publicdir) {
            public_dir = tconfig.httpserver.publicdir;
        }

        if (tconfig.httpserver.session) {
            if (tconfig.httpserver.session.secret) {
                session_secret = tconfig.httpserver.session.secret;
            }

            if (tconfig.httpserver.session.cookie_path) {
                session_cookie_path = tconfig.httpserver.session.cookie_path;
            }

            if (tconfig.httpserver.session.cookie_max_age) {
                session_cookie_max_age = tconfig.httpserver.session.cookie_max_age;
            }
        }
    }

    // -----------------------------------------------------------------------------------------------------------------

    const mServer = new Server({
        port: aport,
        middleWares: [
            bodyParser.urlencoded({extended: true}),
            bodyParser.json(),
            cookieParser(),
            session({
                secret: session_secret,
                resave: true,
                saveUninitialized: true,
                store: new session.MemoryStore(),
                cookie: {
                    path: session_cookie_path,
                    secure: false,
                    maxAge: session_cookie_max_age
                }
            })
        ],
        routes: [],
        controllers: [
            LoginController,
            UserController,
            DomainController
        ],
        publicDir: public_dir
    });

    // listen, start express server
    mServer.listen();

    // -----------------------------------------------------------------------------------------------------------------

    if (tconfig.nginx) {
        NginxServer.getInstance({
            config: tconfig.nginx.config,
            prefix: tconfig.nginx.prefix
        });
    }

    await NginxService.getInstance().start();

})();