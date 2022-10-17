import minimist from 'minimist';
import * as path from 'path';
import * as fs from 'fs';
import {DomainRecord as DomainRecordDB} from './inc/Db/MariaDb/Entity/DomainRecord';
import {GatewayIdentifier as GatewayIdentifierDB} from './inc/Db/MariaDb/Entity/GatewayIdentifier';
import {NginxUpstream as NginxUpstreamDB} from './inc/Db/MariaDb/Entity/NginxUpstream';
import {Dns2Server} from './inc/Dns/Dns2Server';
import {Logger} from './inc/Logger/Logger';
import {NginxStatusService} from './inc/Service/NginxStatusService';
import {Update as HimHipUpdateController} from './Routes/HimHip/Update';
import {GatewayIdentifier as GatewayIdentifierController} from './Routes/Main/GatewayIdentifier';
import {Ssl as SslController} from './Routes/Main/Ssl';
import {Domain as DomainController} from './Routes/Main/Domain';
import {DynDnsClient as DynDnsClientController} from './Routes/Main/DynDnsClient';
import {Route as RouteController} from './Routes/Main/Route';
import {Listen as ListenController} from './Routes/Main/Listen';
import {Ssh as SshController} from './Routes/Main/Ssh';
import {Login as LoginController} from './Routes/Main/Login';
import {Nginx as NginxController} from './Routes/Main/Nginx';
import {UpnpNat as UpnpNatController} from './Routes/Main/UpnpNat';
import {User as UserController} from './Routes/Main/User';
import {AddressAccess as NjsAddressAccessController} from './Routes/Njs/AddressAccess';
import {AuthBasic as NjsAuthBasicController} from './Routes/Njs/AuthBasic';
import {Config} from './inc/Config/Config';
import {v4 as uuid} from 'uuid';
import * as bodyParser from 'body-parser';
import session from 'express-session';
import {DBSetup} from './inc/Db/MariaDb/DBSetup';
import {Credential as CredentialDB} from './inc/Db/MariaDb/Entity/Credential';
import {CredentialUser as CredentialUserDB} from './inc/Db/MariaDb/Entity/CredentialUser';
import {DynDnsClient as DynDnsClientDB} from './inc/Db/MariaDb/Entity/DynDnsClient';
import {DynDnsClientDomain as DynDnsClientDomainDB} from './inc/Db/MariaDb/Entity/DynDnsClientDomain';
import {IpBlacklist as IpBlacklistDB} from './inc/Db/MariaDb/Entity/IpBlacklist';
import {NatPort as NatPortDB} from './inc/Db/MariaDb/Entity/NatPort';
import {Domain as DomainDB} from './inc/Db/MariaDb/Entity/Domain';
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

    // init logger
    Logger.getLogger();

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
                DomainDB,
                DomainRecordDB,
                NginxStreamDB,
                NginxUpstreamDB,
                NginxHttpDB,
                NginxLocationDB,
                IpBlacklistDB,
                DynDnsClientDB,
                DynDnsClientDomainDB,
                SshPortDB,
                SshUserDB,
                NatPortDB,
                CredentialDB,
                CredentialUserDB,
                GatewayIdentifierDB
            ],
            migrations: [
            ],
            migrationsRun: true,
            synchronize: true
        });

        // db setup first init
        await DBSetup.firstInit();
    } catch (error) {
        Logger.getLogger().error('Error while connecting to the database', error);
        return;
    }

    // start server ----------------------------------------------------------------------------------------------------

    let aport = 3000;
    let public_dir = '';
    let ssl_path = '';
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

        if (tconfig.httpserver.sslpath) {
            ssl_path = tconfig.httpserver.sslpath;
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
                proxy: true,
                resave: true,
                saveUninitialized: true,
                store: new session.MemoryStore(),
                cookie: {
                    path: session_cookie_path,
                    secure: ssl_path !== '',
                    maxAge: session_cookie_max_age
                }
            })
        ],
        routes: [],
        controllers: [
            LoginController,
            UserController,
            DomainController,
            DynDnsClientController,
            RouteController,
            ListenController,
            SshController,
            GatewayIdentifierController,
            UpnpNatController,
            SslController,
            NginxController,

            NjsAddressAccessController,
            NjsAuthBasicController,

            HimHipUpdateController
        ],
        publicDir: public_dir,
        sslPath: ssl_path
    });

    // listen, start express server
    await mServer.listen();

    // -----------------------------------------------------------------------------------------------------------------

    if (tconfig.nginx) {
        NginxServer.getInstance({
            config: tconfig.nginx.config,
            prefix: tconfig.nginx.prefix
        });
    }

    await NginxService.getInstance().start();

    // -----------------------------------------------------------------------------------------------------------------
    const dnsServer = new Dns2Server();
    dnsServer.listen();

    // -----------------------------------------------------------------------------------------------------------------

    if (tconfig.upnpnat) {
        if (tconfig.upnpnat.enable) {
            const upnpNat = new UpnpNatService();
            upnpNat.start();
        }
    }

    // -----------------------------------------------------------------------------------------------------------------

    if (tconfig.dyndnsclient) {
        if (tconfig.dyndnsclient.enable) {
            await DynDnsService.getInstance().start();
        }
    }


    // -----------------------------------------------------------------------------------------------------------------

    await NginxStatusService.getInstance().start();
    await HowIsMyPublicIpService.getInstance().start();
})();