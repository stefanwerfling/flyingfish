import * as path from 'path';
import * as fs from 'fs';
import {
    Args,
    DBHelper, DBEntitiesLoader,
    Logger, PluginManager
} from 'flyingfish_core';
import {EntitySchema, MixedList} from 'typeorm';
import {InfluxDbHelper} from './inc/Db/InfluxDb/InfluxDbHelper.js';
import {IpBlacklistCategory as IpBlacklistCategoryDB} from './inc/Db/MariaDb/Entity/IpBlacklistCategory.js';
import {IpBlacklistMaintainer as IpBlacklistMaintainerDB} from './inc/Db/MariaDb/Entity/IpBlacklistMaintainer.js';
import {IpListMaintainer as IpListMaintainerDB} from './inc/Db/MariaDb/Entity/IpListMaintainer.js';
import {IpLocation as IpLocationDB} from './inc/Db/MariaDb/Entity/IpLocation.js';
import {IpWhitelist as IpWhitelistDB} from './inc/Db/MariaDb/Entity/IpWhitelist.js';
import {NginxHttpVariable as NginxHttpVariableDB} from './inc/Db/MariaDb/Entity/NginxHttpVariable.js';
import {NginxUpstream as NginxUpstreamDB} from './inc/Db/MariaDb/Entity/NginxUpstream.js';
import {Settings as SettingsDB} from './inc/Db/MariaDb/Entity/Settings.js';
import {Dns2Server} from './inc/Dns/Dns2Server.js';
import {SchemaFlyingFishArgs} from './inc/Env/Args.js';
import {BlacklistService} from './inc/Service/BlacklistService.js';
import {IpLocationService} from './inc/Service/IpLocationService.js';
import {IpService} from './inc/Service/IpService.js';
import {NginxStatusService} from './inc/Service/NginxStatusService.js';
import {SslCertService} from './inc/Service/SslCertService.js';
import {FlyingFishSsl} from './inc/Utils/FlyingFishSsl.js';
import {Update as HimHipUpdateController} from './Routes/HimHip/Update.js';
import {Dashboard as DashboardController} from './Routes/Main/Dashboard.js';
import {GatewayIdentifier as GatewayIdentifierController} from './Routes/Main/GatewayIdentifier.js';
import {IpAccess as IpAccessController} from './Routes/Main/IpAccess.js';
import {Settings as SettingsController} from './Routes/Main/Settings.js';
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
import {DynDnsServer as DynDnsServerController} from './Routes/Main/DynDnsServer.js';
import {Config} from './inc/Config/Config.js';
import {v4 as uuid} from 'uuid';
import {DBSetup} from './inc/Db/MariaDb/DBSetup.js';
import {IpBlacklist as IpBlacklistDB} from './inc/Db/MariaDb/Entity/IpBlacklist.js';
import {NginxHttp as NginxHttpDB} from './inc/Db/MariaDb/Entity/NginxHttp.js';
import {NginxListen as NginxListenDB} from './inc/Db/MariaDb/Entity/NginxListen.js';
import {NginxLocation as NginxLocationDB} from './inc/Db/MariaDb/Entity/NginxLocation.js';
import {NginxStream as NginxStreamDB} from './inc/Db/MariaDb/Entity/NginxStream.js';
import {NginxServer} from './inc/Nginx/NginxServer.js';
import {HttpServer} from './inc/Server/HttpServer.js';
import {DynDnsService} from './inc/Service/DynDnsService.js';
import {HowIsMyPublicIpService} from './inc/Service/HowIsMyPublicIpService.js';
import {NginxService} from './inc/Service/NginxService.js';
import {UpnpNatService} from './inc/Service/UpnpNatService.js';
import exitHook from 'async-exit-hook';

/**
 * Main
 */
(async(): Promise<void> => {
    // load config -----------------------------------------------------------------------------------------------------

    const argv = Args.get(SchemaFlyingFishArgs);
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

    // init logger
    Logger.getLogger();
    Logger.getLogger().info('Start FlyingFish Service ...');

    // load plugins ----------------------------------------------------------------------------------------------------

    const pm = new PluginManager('backend', path.resolve());
    await pm.start();

    // -----------------------------------------------------------------------------------------------------------------

    try {
        // MariaDb -----------------------------------------------------------------------------------------------------
        // eslint-disable-next-line @typescript-eslint/ban-types
        const entities: MixedList<Function | string | EntitySchema> = await DBEntitiesLoader.loadEntities() as [];

        entities.push(NginxListenDB);
        entities.push(NginxStreamDB);
        entities.push(NginxUpstreamDB);
        entities.push(NginxHttpDB);
        entities.push(NginxHttpVariableDB);
        entities.push(NginxLocationDB);
        entities.push(IpListMaintainerDB);
        entities.push(IpLocationDB);
        entities.push(IpBlacklistDB);
        entities.push(IpBlacklistCategoryDB);
        entities.push(IpBlacklistMaintainerDB);
        entities.push(IpWhitelistDB);
        entities.push(SettingsDB);

        await DBHelper.init({
            type: 'mysql',
            host: tConfig.db.mysql.host,
            port: tConfig.db.mysql.port,
            username: tConfig.db.mysql.username,
            password: tConfig.db.mysql.password,
            database: tConfig.db.mysql.database,
            entities: entities,
            migrations: [],
            migrationsRun: true,
            synchronize: true
        });

        // db setup first init
        await DBSetup.firstInit();

        // InfluxDb ----------------------------------------------------------------------------------------------------

        if (tConfig.db.influx) {
            await InfluxDbHelper.init({
                url: tConfig.db.influx.url,
                token: tConfig.db.influx.token,
                org: tConfig.db.influx.org,
                bucket: tConfig.db.influx.bucket
            });
        }
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

    if (tConfig.httpserver) {
        if (tConfig.httpserver.port) {
            aport = tConfig.httpserver.port;
        }

        if (tConfig.httpserver.publicdir) {
            public_dir = tConfig.httpserver.publicdir;
        }

        if (tConfig.httpserver.session) {
            if (tConfig.httpserver.session.secret) {
                session_secret = tConfig.httpserver.session.secret;
            }

            if (tConfig.httpserver.session.cookie_path) {
                session_cookie_path = tConfig.httpserver.session.cookie_path;
            }

            if (tConfig.httpserver.session.cookie_max_age) {
                session_cookie_max_age = tConfig.httpserver.session.cookie_max_age;
            }
        }

        if (tConfig.httpserver.sslpath) {
            ssl_path = tConfig.httpserver.sslpath;
        }
    }

    // -----------------------------------------------------------------------------------------------------------------

    const mServer = new HttpServer({
        realm: 'FlyingFish',
        port: aport,
        session: {
            secret: session_secret,
            cookie_path: session_cookie_path,
            ssl_path: ssl_path,
            max_age: session_cookie_max_age
        },
        routes: [
            new LoginController(),
            new UserController(),
            new DomainController(),
            new DynDnsClientController(),
            new DynDnsServerController(),
            new RouteController(),
            new ListenController(),
            new UpnpNatController(),
            new NginxController(),
            new DashboardController(),
            new GatewayIdentifierController(),
            new IpAccessController(),
            new SslController(),
            new SshController(),
            new SettingsController(),

            new NjsAddressAccessController(),
            new NjsAuthBasicController(),

            new HimHipUpdateController()
        ],
        publicDir: public_dir,
        crypt: {
            sslPath: ssl_path,
            key: FlyingFishSsl.FILE_KEYPEM,
            crt: FlyingFishSsl.FILE_CRT
        }
    });

    // listen, start express server
    await mServer.listen();

    // -----------------------------------------------------------------------------------------------------------------

    if (tConfig.nginx) {
        NginxServer.getInstance({
            config: tConfig.nginx.config,
            prefix: tConfig.nginx.prefix
        });
    }

    await NginxService.getInstance().start();

    // -----------------------------------------------------------------------------------------------------------------
    const dnsServer = new Dns2Server();
    dnsServer.listen();

    // -----------------------------------------------------------------------------------------------------------------

    if (tConfig.upnpnat) {
        if (tConfig.upnpnat.enable) {
            const upnpNat = new UpnpNatService();
            await upnpNat.start();
        }
    }

    // -----------------------------------------------------------------------------------------------------------------

    if (tConfig.dyndnsclient) {
        if (tConfig.dyndnsclient.enable) {
            await DynDnsService.getInstance().start();
        }
    }

    // -----------------------------------------------------------------------------------------------------------------

    // wait
    await NginxStatusService.getInstance().start();
    await HowIsMyPublicIpService.getInstance().start();
    await SslCertService.getInstance().start();

    // not await
    BlacklistService.getInstance().start().then();
    IpLocationService.getInstance().start().then();
    IpService.getInstance().start().then();

    // exit ------------------------------------------------------------------------------------------------------------

    exitHook(async(callback): Promise<void> => {
        Logger.getLogger().info('Stop FlyingFish Service ...');

        await NginxService.getInstance().stop(true);

        Logger.getLogger().info('... End.');

        callback();
    });
})();