import minimist from 'minimist';
import * as path from 'path';
import * as fs from 'fs';
import {Certificate as CertificateController} from './app/Main/Certificate';
import {Host as HostController} from './app/Main/Host';
import {Listen as ListenController} from './app/Main/Listen';
import {Login as LoginController} from './app/Main/Login';
import {Nginx as NginxController} from './app/Main/Nginx';
import {UpnpNat as UpnpNatController} from './app/Main/UpnpNat';
import {User as UserController} from './app/Main/User';
import {AddressAccess as AddressAccessController} from './app/Njs/AddressAccess';
import {AuthBasic as AuthBasicController} from './app/Njs/AuthBasic';
import {Config} from './inc/Config/Config';
import {v4 as uuid} from 'uuid';
import * as bodyParser from 'body-parser';
import session from 'express-session';
import {DBSetup} from './inc/Db/MariaDb/DBSetup';
import {DynDnsClient as DynDnsClientDB} from './inc/Db/MariaDb/Entity/DynDnsClient';
import {IpBlacklist as IpBlacklistDB} from './inc/Db/MariaDb/Entity/IpBlacklist';
import {NatPort as NatPortDB} from './inc/Db/MariaDb/Entity/NatPort';
import {NginxDomain as NginxDomainDB} from './inc/Db/MariaDb/Entity/NginxDomain';
import {NginxHttp as NginxHttpDB} from './inc/Db/MariaDb/Entity/NginxHttp';
import {NginxListen as NginxListenDB} from './inc/Db/MariaDb/Entity/NginxListen';
import {NginxLocation as NginxLocationDB} from './inc/Db/MariaDb/Entity/NginxLocation';
import {NginxStream as NginxStreamDB} from './inc/Db/MariaDb/Entity/NginxStream';
import {SshPort as SshPortDB} from './inc/Db/MariaDb/Entity/SshPort';
import {SshUser as SshUserDB} from './inc/Db/MariaDb/Entity/SshUser';
import {User as UserDB} from './inc/Db/MariaDb/Entity/User';
import {MariaDbHelper} from './inc/Db/MariaDb/MariaDbHelper';
import {NginxServer} from './inc/Nginx/NginxServer';
import {Server} from './inc/Server/Server';
import cookieParser from 'cookie-parser';
import {DynDnsService} from './inc/Service/DynDnsService';
import {HowIsMyPublicIpService} from './inc/Service/HowIsMyPublicIpService';
import {NginxService} from './inc/Service/NginxService';
import {UpnpNatService} from './inc/Service/UpnpNatService';

/**
 * Main
 */
(async(): Promise<void> => {
    const argv = minimist(process.argv.slice(2));
    let configfile = path.join(__dirname, `/${Config.DEFAULT_CONFIG_FILE}`);

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

    // set global
    Config.set(tconfig);

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
                NginxLocationDB,
                IpBlacklistDB,
                DynDnsClientDB,
                SshPortDB,
                SshUserDB,
                NatPortDB
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
            HostController,
            ListenController,
            UpnpNatController,
            CertificateController,
            NginxController,

            AddressAccessController,
            AuthBasicController
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

    // -----------------------------------------------------------------------------------------------------------------

    const upnpNat = new UpnpNatService();
    upnpNat.start();

    // -----------------------------------------------------------------------------------------------------------------

    const dyndns = new DynDnsService();
    dyndns.start();

    // -----------------------------------------------------------------------------------------------------------------

    const himpip = new HowIsMyPublicIpService();
    himpip.start();

})();