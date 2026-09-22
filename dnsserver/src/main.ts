import {Args, DBHelper, Logger} from '@stefanwerfling/figtree';
import {
    AcmeDnsTempRecordDB,
    DBService,
    DomainDB,
    DomainRecordDB,
    HubClusterDomainsClient,
    PkiBootstrapSocketClient,
    PkiCaPurpose,
    PkiClientIdentity,
    PkiNodeClient,
    PkiNodeEnroller,
    PkiNodeFileStore,
    PkiNodeHttpTransport,
    startHubRegistration
} from 'flyingfish_core';
import {SchemaDefaultArgs} from 'figtree-schemas';
import {buildDnsCapabilityManifest} from 'flyingfish_schemas';
import * as fs from 'fs';
import os from 'os';
import path from 'path';
import {Config} from './inc/Config/Config.js';
import {Dns2Server} from './inc/Dns/Dns2Server.js';
import {NodeTargetClient} from './inc/System/NodeTargetClient.js';

/**
 * How often the DNS server refreshes the cluster domain failover overrides from the
 * Hub (ms). Well below the node liveness stale window so failover takes effect fast.
 */
const CLUSTER_DOMAINS_REFRESH_MS = 15000;

/**
 * How often the DNS server refreshes this node's resolved target IP from the backend (ms),
 * used to answer follow-node A/AAAA records (Attach/Router epic).
 */
const NODE_TARGET_REFRESH_MS = 15000;

/**
 * Main
 */
(async(): Promise<void> => {
    const argv = Args.get(SchemaDefaultArgs);
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

    Logger.getLogger();

    Logger.getLogger().info('Start FlyingFish DNS Server ...');

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
                AcmeDnsTempRecordDB,
                DomainDB,
                DomainRecordDB
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

    // start server ----------------------------------------------------------------------------------------------------

    await Dns2Server.getInstance().listen();

    // Node PKI (v2 own-PKI epic 9.4): opt-in enroll + auto-renew of this part's
    // own service certificate, BEFORE Hub registration so the registration can
    // authenticate over mTLS with it. Optional and non-fatal — without pki config
    // the DNS server simply runs without a node certificate.
    let nodeIdentity: PkiClientIdentity | undefined;

    if (tConfig.pki) {
        try {
            const store = new PkiNodeFileStore(
                tConfig.pki.storeDir ?? tConfig.flyingfish_libpath ?? Config.DEFAULT_FF_DIR
            );

            const bootstrapSocket = tConfig.pki.bootstrapSocket;
            const bootstrapTokenProvider = bootstrapSocket
                ? (purpose: PkiCaPurpose): Promise<string> => new PkiBootstrapSocketClient(bootstrapSocket).fetchToken(purpose)
                : undefined;

            const enroller = new PkiNodeEnroller(
                new PkiNodeClient(new PkiNodeHttpTransport(tConfig.pki.url)),
                store,
                {
                    bootstrapToken: tConfig.pki.bootstrapToken,
                    bootstrapTokenProvider: bootstrapTokenProvider,
                    purpose: PkiCaPurpose.service,
                    commonName: tConfig.pki.commonName ?? `dns@${os.hostname()}`
                }
            );

            const identity = await enroller.ensure();

            nodeIdentity = {cert: identity.certificate, key: identity.privateKey};

            Logger.getLogger().info(`Node PKI identity ready (nodeUid ${identity.nodeUid})`);
        } catch (error) {
            Logger.getLogger().error('Node PKI enrollment failed (continuing without a node certificate)', error);
        }
    }

    // Announce this part to the Hub registry (v2 modular architecture). Optional:
    // without registry config the DNS server simply does not self-register. When a
    // node certificate was obtained above, the registration authenticates over
    // mTLS with it instead of relying on the shared secret alone.
    if (tConfig.registry) {
        await startHubRegistration(
            tConfig.registry.url,
            tConfig.registry.secret,
            buildDnsCapabilityManifest(`dns@${os.hostname()}`),
            {identity: nodeIdentity}
        );

        // Cluster domain failover (Cluster/Mesh epic 9.5.14): pull the Hub's cluster
        // domains view and keep a name→active-IP override so an A record for a
        // cluster-managed domain answers with the current active (live, highest-
        // priority) node's IP. Best-effort: a transient Hub outage keeps the last set.
        const domainsClient = new HubClusterDomainsClient({
            hubUrl: tConfig.registry.url,
            secret: tConfig.registry.secret
        });

        const refreshClusterActiveIps = async(): Promise<void> => {
            const overrides = new Map<string, string>();

            for (const domain of await domainsClient.list()) {
                if (domain.activeIp !== null) {
                    overrides.set(domain.name.toLowerCase(), domain.activeIp);
                }
            }

            Dns2Server.getInstance().setClusterActiveIps(overrides);
        };

        await refreshClusterActiveIps().catch((error: unknown): void => {
            Logger.getLogger().warn('Cluster domain failover refresh failed on start (will retry)', error);
        });

        setInterval((): void => {
            refreshClusterActiveIps().catch((error: unknown): void => {
                Logger.getLogger().warn('Cluster domain failover refresh failed (will retry next interval)', error);
            });
        }, CLUSTER_DOMAINS_REFRESH_MS).unref();

        // Node target IP (Attach/Router epic): pull this node's resolved reachable IP from
        // the backend so follow-node A/AAAA records answer with it. Best-effort: a transient
        // backend outage keeps the last known value.
        const nodeTargetClient = new NodeTargetClient(tConfig.registry.url, tConfig.registry.secret);

        const refreshNodeTargetIp = async(): Promise<void> => {
            Dns2Server.getInstance().setNodeTargetIp(await nodeTargetClient.fetchTargetIp());
        };

        await refreshNodeTargetIp().catch((error: unknown): void => {
            Logger.getLogger().warn('Node target IP refresh failed on start (will retry)', error);
        });

        setInterval((): void => {
            refreshNodeTargetIp().catch((error: unknown): void => {
                Logger.getLogger().warn('Node target IP refresh failed (will retry next interval)', error);
            });
        }, NODE_TARGET_REFRESH_MS).unref();
    }
})().catch((error: unknown): void => {
    // The logging framework may not be seated yet if boot fails this early,
    // so report to stderr and exit non-zero (lets the container restart).
    console.error('FlyingFish DNS server failed to start:', error);
    process.exit(1);
});