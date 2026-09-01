import {BackendApp, BaseHttpServer, Logger, MariaDBService, RedisDBService} from 'figtree';
import {ConfigOptions, DefaultArgs, SchemaDefaultArgs} from 'figtree-schemas';
import {PluginManager, PluginServiceNames} from 'flyingfish_core';
import path from 'path';
import {Schema} from 'vts';
import {CoreConfigBridge} from './Config/CoreConfigBridge.js';
import {Dns2Server} from '../inc/Dns/Dns2Server.js';
import {HimHIP} from '../inc/HimHIP/HimHIP.js';
import {FlyingFishConfig} from './Config/FlyingFishConfig.js';
import {CoreDBConnectHook} from './Db/MariaDb/CoreDBConnectHook.js';
import {DBLoader} from './Db/MariaDb/DBLoader.js';
import {FirstInitSetupHook} from './Db/MariaDb/FirstInitSetupHook.js';
import {RouteLoader} from './Routes/RouteLoader.js';
import {FlyingFishHttpService} from './Server/FlyingFishHttpService.js';
import {BlacklistService} from './Service/BlacklistService.js';
import {DynDnsService} from './Service/DynDnsService.js';
import {HowIsMyPublicIpService} from './Service/HowIsMyPublicIpService.js';
import {InfluxDbService} from './Service/InfluxDbService.js';
import {IpLocationService} from './Service/IpLocationService.js';
import {IpService} from './Service/IpService.js';
import {NginxService} from './Service/NginxService.js';
import {SslCertService} from './Service/SslCertService.js';
import {UpnpNatService} from './Service/UpnpNatService.js';
import {HubRegistryService} from './Hub/HubRegistryService.js';
import {NginxStatusService} from './Service/NginxStatusService.js';

/**
 * FlyingFishBackend
 *
 * The figtree application root for the FlyingFish backend. Replaces the
 * hand-wired boot sequence in the former `main.ts`: figtree's `BackendApp`
 * owns config loading, logging, the service lifecycle and graceful shutdown;
 * this subclass only declares which services make up FlyingFish.
 *
 * Strangler status: this first slice registers the database and HTTP server.
 * The remaining services (Nginx, DNS, DynDns, UPnP, SSL, IP location,
 * blacklist, HimHIP/Redis) are migrated onto `_serviceManager` incrementally.
 */
export class FlyingFishBackend extends BackendApp<DefaultArgs, ConfigOptions> {

    /**
     * Backend name.
     */
    public static NAME = 'flyingfish';

    /**
     * Constructor.
     */
    public constructor() {
        super(FlyingFishBackend.NAME);
    }

    /**
     * Return the config instance.
     * @return {FlyingFishConfig}
     * @protected
     */
    protected override _getConfigInstance(): FlyingFishConfig {
        const config = FlyingFishConfig.getInstance();
        config.setAppName(FlyingFishBackend.NAME);
        config.setAppTitle('FlyingFish');

        return config;
    }

    /**
     * Return the argument schema.
     * @return {Schema<DefaultArgs>|null}
     * @protected
     */
    protected override _getArgSchema(): Schema<DefaultArgs>|null {
        return SchemaDefaultArgs;
    }

    /**
     * Register the services.
     * @protected
     */
    protected override async _initServices(): Promise<void> {
        // Strangler bridge (config): seat the flyingfish_core Config singleton so
        // core code that reads `Config.getInstance().get()` (e.g. core's Logger)
        // sees the config the figtree boot loaded into FlyingFishConfig. Without
        // this, core reads an unseated plain Config (null) and falls back to
        // /var/log/flyingfish.
        CoreConfigBridge.seat();

        // Strangler bridge: the flyingfish_core plugin manager must be
        // initialized before the database service, because core's
        // `DBEntitiesLoader.loadEntities()` queries it for plugin-contributed
        // entities. This is replaced by figtree's `PluginService` later.
        try {
            // figtree's PluginManager scans the `figtree` package.json block by default;
            // FlyingFish plugins declare their manifest under `flyingfish`, so pin pluginKey.
            const pluginManager = new PluginManager(PluginServiceNames.backend, {
                appPath: path.resolve(),
                pluginKey: 'flyingfish'
            });
            await pluginManager.start();
        } catch (error) {
            Logger.getLogger().error('FlyingFishBackend::_initServices: plugin manager could not load the plugins.', error);
        }

        this._serviceManager.add(
            new MariaDBService(
                DBLoader,
                undefined,
                undefined,
                {
                    migrationsRun: true,
                    synchronize: false,
                    // Auto-baseline: databases from the former synchronize:true era
                    // (the `user` table exists but no `migrations` table yet) get
                    // InitialSchema stamped as applied instead of re-created, so
                    // existing v1.1.x installs upgrade without a schema clash.
                    baseline: {
                        legacyTable: 'user',
                        migrationName: 'InitialSchema1787961600000',
                        timestamp: 1787961600000
                    }
                },
                [ new CoreDBConnectHook(), new FirstInitSetupHook() ]
            )
        );

        // Config is already loaded here (BackendApp loads it before
        // _initServices), so the conditional services below can gate on it.
        const config = FlyingFishConfig.getInstance().get();

        // InfluxDb (optional): initialize FlyingFish's InfluxDbHelper before the
        // nginx access-log pipeline needs it.
        if (config?.db?.influx) {
            this._serviceManager.add(new InfluxDbService());
        }

        // HTTP server with the FlyingFish Redis-backed session store. When Redis
        // is configured, depend on the `redis` service so the session store gets
        // a connected client (else it falls back to the in-memory store).
        this._serviceManager.add(new FlyingFishHttpService(
            RouteLoader,
            undefined,
            config?.db?.redis?.url ? [ 'redis' ] : undefined
        ));

        // NginxService keeps its singleton (the nginx reload route +
        // SslCertService call reload() on demand).
        this._serviceManager.add(NginxService.getInstance());

        this._serviceManager.add(new NginxStatusService());
        this._serviceManager.add(new IpLocationService());
        this._serviceManager.add(new BlacklistService());

        // Hub registry (v2 modular architecture): in-memory, no DB dependency.
        // Keeps its singleton so the registry routes reach the same instance.
        this._serviceManager.add(HubRegistryService.getInstance());

        // HowIsMyPublicIpService and IpService keep their singletons (consumers
        // read them on demand), so register those same instances here.
        this._serviceManager.add(HowIsMyPublicIpService.getInstance());
        this._serviceManager.add(IpService.getInstance());

        // Dns2Server keeps its singleton (SslCertService + DNS-record routes
        // drive its temp-record API), so register that same instance here.
        this._serviceManager.add(Dns2Server.getInstance());

        // SslCertService keeps its singleton (the SSL "run now" route reads it);
        // depends on nginx + dnsserver (reload + ACME DNS-01).
        this._serviceManager.add(SslCertService.getInstance());

        // Conditional services: the former main.ts only started these when the
        // corresponding config flag was enabled.
        if (config?.upnpnat?.enable) {
            this._serviceManager.add(new UpnpNatService());
        }

        // DynDnsService keeps its singleton (HowIsMyPublicIpService triggers it +
        // the "run now" route reads it), so register that same instance here.
        if (config?.dyndnsclient?.enable) {
            this._serviceManager.add(DynDnsService.getInstance());
        }

        // Redis mem-db: subscribe the HimHIP channel so the host/gateway data
        // reaches `HimHIP.getData()` (consumed by UpnpNat/DynDns). figtree's
        // RedisDBService owns the connect/registerChannels/disconnect lifecycle
        // (its start() throws when redis config is missing, so gate on the url).
        if (config?.db?.redis?.url) {
            // Point the HTTP->HTTPS redirect at the real host IP as HimHIP
            // reports it, replacing the former main.ts `setListenHost` wiring
            // (uses figtree's new `BaseHttpServer.setListenHost()` seam).
            HimHIP.registerEvent((data): void => {
                if (data !== null) {
                    BaseHttpServer.setListenHost(data.hostip);
                }
            });

            this._serviceManager.add(new RedisDBService([ new HimHIP() ]));
        }
    }

}