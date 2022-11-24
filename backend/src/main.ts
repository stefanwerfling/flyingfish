import minimist from 'minimist';
import * as path from 'path';
import * as fs from 'fs';
import {DBHelper} from './inc/Db/DBHelper.js';
import {DomainRecord as DomainRecordDB} from './inc/Db/MariaDb/Entity/DomainRecord.js';
import {GatewayIdentifier as GatewayIdentifierDB} from './inc/Db/MariaDb/Entity/GatewayIdentifier.js';
import {IpBlacklistCategory as IpBlacklistCategoryDB} from './inc/Db/MariaDb/Entity/IpBlacklistCategory.js';
import {IpBlacklistMaintainer as IpBlacklistMaintainerDB} from './inc/Db/MariaDb/Entity/IpBlacklistMaintainer.js';
import {IpListMaintainer as IpListMaintainerDB} from './inc/Db/MariaDb/Entity/IpListMaintainer.js';
import {NginxUpstream as NginxUpstreamDB} from './inc/Db/MariaDb/Entity/NginxUpstream.js';
import {Settings as SettingsDB} from './inc/Db/MariaDb/Entity/Settings.js';
import {Dns2Server} from './inc/Dns/Dns2Server.js';
import {Logger} from './inc/Logger/Logger.js';
import {BlacklistService} from './inc/Service/BlacklistService.js';
import {NginxStatusService} from './inc/Service/NginxStatusService.js';
import {SslCertService} from './inc/Service/SslCertService.js';
import {Update as HimHipUpdateController} from './Routes/HimHip/Update.js';
import {GatewayIdentifier as GatewayIdentifierController} from './Routes/Main/GatewayIdentifier.js';
import {IpAccess as IpAccessController} from './Routes/Main/IpAccess.js';
import {Ssl as SslController} from './Routes/Main/Ssl.js';
import {Domain as DomainController} from './Routes/Main/Domain.js';
import {DynDnsClient as DynDnsClientController} from './Routes/Main/DynDnsClient.js';
import {Route as RouteController} from './Routes/Main/Route.js';
import {Listen as ListenController} from './Routes/Main/Listen.js';
import {Ssh as SshController} from './Routes/Main/Ssh.js';
import {Login as LoginController} from './Routes/Main/Login.js';
import {Nginx as NginxController} from './Routes/Main/Nginx.js';
import {UpnpNat as UpnpNatController} from './Routes/Main/UpnpNat.js';
import {User as UserController} from './Routes/Main/User.js';
import {AddressAccess as NjsAddressAccessController} from './Routes/Njs/AddressAccess.js';
import {AuthBasic as NjsAuthBasicController} from './Routes/Njs/AuthBasic.js';
import {Config} from './inc/Config/Config.js';
import {v4 as uuid} from 'uuid';
import bodyParser from 'body-parser';
import session from 'express-session';
import {DBSetup} from './inc/Db/MariaDb/DBSetup.js';
import {Credential as CredentialDB} from './inc/Db/MariaDb/Entity/Credential.js';
import {CredentialUser as CredentialUserDB} from './inc/Db/MariaDb/Entity/CredentialUser.js';
import {DynDnsClient as DynDnsClientDB} from './inc/Db/MariaDb/Entity/DynDnsClient.js';
import {DynDnsClientDomain as DynDnsClientDomainDB} from './inc/Db/MariaDb/Entity/DynDnsClientDomain.js';
import {IpBlacklist as IpBlacklistDB} from './inc/Db/MariaDb/Entity/IpBlacklist.js';
import {NatPort as NatPortDB} from './inc/Db/MariaDb/Entity/NatPort.js';
import {Domain as DomainDB} from './inc/Db/MariaDb/Entity/Domain.js';
import {NginxHttp as NginxHttpDB} from './inc/Db/MariaDb/Entity/NginxHttp.js';
import {NginxListen as NginxListenDB} from './inc/Db/MariaDb/Entity/NginxListen.js';
import {NginxLocation as NginxLocationDB} from './inc/Db/MariaDb/Entity/NginxLocation.js';
import {NginxStream as NginxStreamDB} from './inc/Db/MariaDb/Entity/NginxStream.js';
import {SshPort as SshPortDB} from './inc/Db/MariaDb/Entity/SshPort.js';
import {SshUser as SshUserDB} from './inc/Db/MariaDb/Entity/SshUser.js';
import {User as UserDB} from './inc/Db/MariaDb/Entity/User.js';
import {NginxServer} from './inc/Nginx/NginxServer.js';
import {Server} from './inc/Server/Server.js';
import cookieParser from 'cookie-parser';
import {DynDnsService} from './inc/Service/DynDnsService.js';
import {HowIsMyPublicIpService} from './inc/Service/HowIsMyPublicIpService.js';
import {NginxService} from './inc/Service/NginxService.js';
import {UpnpNatService} from './inc/Service/UpnpNatService.js';
import exitHook from 'async-exit-hook';

/**
 * Main
 */
(async(): Promise<void> => {
    const argv = minimist(process.argv.slice(2));
    let configfile = path.join(path.resolve(), `/${Config.DEFAULT_CONFIG_FILE}`);

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

    Logger.getLogger().info('Start FlyingFish Service ...');

    // -----------------------------------------------------------------------------------------------------------------

    try {
        // MariaDb -----------------------------------------------------------------------------------------------------
        await DBHelper.init({
            type: 'mysql',
            host: tconfig.db.mysql.host,
            port: tconfig.db.mysql.port,
            username: tconfig.db.mysql.username,
            password: tconfig.db.mysql.password,
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
                IpListMaintainerDB,
                IpBlacklistDB,
                IpBlacklistCategoryDB,
                IpBlacklistMaintainerDB,
                DynDnsClientDB,
                DynDnsClientDomainDB,
                SshPortDB,
                SshUserDB,
                NatPortDB,
                CredentialDB,
                CredentialUserDB,
                GatewayIdentifierDB,
                SettingsDB
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
            IpAccessController,

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
            await upnpNat.start();
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
    await SslCertService.getInstance().start();
    await BlacklistService.getInstance().start();

    // exit ------------------------------------------------------------------------------------------------------------

    exitHook(async(callback): Promise<void> => {
        Logger.getLogger().info('Stop FlyingFish Service ...');

        await NginxService.getInstance().stop(true);

        Logger.getLogger().info('... End.');

        callback();
    });
})();