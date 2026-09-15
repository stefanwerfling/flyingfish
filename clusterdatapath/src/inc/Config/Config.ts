import {Config as ConfigCore} from '@stefanwerfling/figtree';
import {ConfigOptionsClusterDatapath, SchemaConfigOptionsClusterDatapath} from 'flyingfish_schemas';
import path from 'path';
import process from 'process';

/**
 * ENV_OPTIONAL
 */
export enum ENV_OPTIONAL {
    LOGGING_LEVEL = 'FLYINGFISH_LOGGING_LEVEL',
    CLUSTERDATAPATH_PORT = 'FLYINGFISH_CLUSTERDATAPATH_PORT',
    REGISTRY_URL = 'FLYINGFISH_REGISTRY_URL',
    REGISTRY_SECRET = 'FLYINGFISH_REGISTRY_SECRET',
    PKI_URL = 'FLYINGFISH_PKI_URL',
    PKI_BOOTSTRAP_TOKEN = 'FLYINGFISH_PKI_BOOTSTRAP_TOKEN',
    PKI_BOOTSTRAP_SOCKET = 'FLYINGFISH_PKI_BOOTSTRAP_SOCKET',
    PKI_STORE_DIR = 'FLYINGFISH_PKI_STORE_DIR',
    CLUSTER_TRANSPORT = 'FLYINGFISH_CLUSTER_TRANSPORT',
    CLUSTER_PEER_PORT = 'FLYINGFISH_CLUSTER_PEER_PORT',
    CLUSTER_ADVERTISE_HOST = 'FLYINGFISH_CLUSTER_ADVERTISE_HOST',
    CLUSTER_SYNC_INTERVAL_MS = 'FLYINGFISH_CLUSTER_SYNC_INTERVAL_MS',
    CLUSTER_OVERLAY_IP = 'FLYINGFISH_CLUSTER_OVERLAY_IP',
    CLUSTER_OVERLAY_NETMASK = 'FLYINGFISH_CLUSTER_OVERLAY_NETMASK',
    CLUSTER_TUN_NAME = 'FLYINGFISH_CLUSTER_TUN_NAME'
}

/**
 * Config — the cluster data-plane node is database-free; its config needs an HTTP
 * port plus the Hub registry, node PKI and mesh (transport + overlay/TUN) blocks.
 */
export class Config extends ConfigCore<ConfigOptionsClusterDatapath> {

    /**
     * FlyingFish infrastructure defaults, re-declared here now that this Config
     * extends figtree's generic `Config`.
     */
    public static readonly DEFAULT_FF_DIR = path.join('/', 'var', 'lib', 'flyingfish');
    public static readonly DEFAULT_CLUSTERDATAPATH_PORT = 5337;
    public static readonly DEFAULT_CONFIG_FILE = 'config.json';

    /**
     * getInstance
     */
    public static override getInstance(): Config {
        if (!ConfigCore._instance) {
            const instance = new Config(SchemaConfigOptionsClusterDatapath);
            instance.setAppName('flyingfish');
            ConfigCore._instance = instance;
        }

        return ConfigCore._instance as Config;
    }

    /**
     * _loadEnv
     * @param aConfig
     * @protected
     */
    protected override _loadEnv(aConfig: ConfigOptionsClusterDatapath | null): ConfigOptionsClusterDatapath | null {
        let config = aConfig;

        if (config === null) {
            config = {
                clusterdatapath: {
                    port: Config.DEFAULT_CLUSTERDATAPATH_PORT
                }
            };
        }

        // data-plane HTTP port ----------------------------------------------------------------------------------------

        if (process.env[ENV_OPTIONAL.CLUSTERDATAPATH_PORT]) {
            if (!config.clusterdatapath) {
                config.clusterdatapath = {};
            }

            config.clusterdatapath.port = parseInt(process.env[ENV_OPTIONAL.CLUSTERDATAPATH_PORT]!, 10) ||
                Config.DEFAULT_CLUSTERDATAPATH_PORT;
        }

        // Logging -----------------------------------------------------------------------------------------------------

        if (process.env[ENV_OPTIONAL.LOGGING_LEVEL]) {
            config.logging = {
                level: process.env[ENV_OPTIONAL.LOGGING_LEVEL]
            };
        }

        // Hub registry (v2): both url and secret required to announce.
        if (process.env[ENV_OPTIONAL.REGISTRY_URL] && process.env[ENV_OPTIONAL.REGISTRY_SECRET]) {
            config.registry = {
                url: process.env[ENV_OPTIONAL.REGISTRY_URL]!,
                secret: process.env[ENV_OPTIONAL.REGISTRY_SECRET]!
            };
        }

        // Node PKI (own-PKI epic 9.4): url + a bootstrap token OR a bootstrap socket.
        const pkiUrl = process.env[ENV_OPTIONAL.PKI_URL];
        const pkiToken = process.env[ENV_OPTIONAL.PKI_BOOTSTRAP_TOKEN];
        const pkiSocket = process.env[ENV_OPTIONAL.PKI_BOOTSTRAP_SOCKET];

        if (pkiUrl && (pkiToken || pkiSocket)) {
            config.pki = {
                url: pkiUrl,
                bootstrapToken: pkiToken,
                bootstrapSocket: pkiSocket,
                storeDir: process.env[ENV_OPTIONAL.PKI_STORE_DIR]
            };
        }

        // Mesh data plane: transport wire, peer endpoint + overlay/TUN.
        const transport = process.env[ENV_OPTIONAL.CLUSTER_TRANSPORT];
        const peerPort = process.env[ENV_OPTIONAL.CLUSTER_PEER_PORT];
        const advertiseHost = process.env[ENV_OPTIONAL.CLUSTER_ADVERTISE_HOST];
        const syncIntervalMs = process.env[ENV_OPTIONAL.CLUSTER_SYNC_INTERVAL_MS];
        const overlayIp = process.env[ENV_OPTIONAL.CLUSTER_OVERLAY_IP];
        const overlayNetmask = process.env[ENV_OPTIONAL.CLUSTER_OVERLAY_NETMASK];
        const tunName = process.env[ENV_OPTIONAL.CLUSTER_TUN_NAME];

        if (transport || peerPort || advertiseHost || syncIntervalMs || overlayIp || overlayNetmask || tunName) {
            config.cluster = {
                transport: transport,
                peerPort: peerPort ? parseInt(peerPort, 10) : undefined,
                advertiseHost: advertiseHost,
                syncIntervalMs: syncIntervalMs ? parseInt(syncIntervalMs, 10) : undefined,
                overlayIp: overlayIp,
                overlayNetmask: overlayNetmask,
                tunName: tunName
            };
        }

        return config;
    }

    /**
     * _setDefaults
     * @param config
     * @protected
     */
    protected override _setDefaults(config: ConfigOptionsClusterDatapath | null): ConfigOptionsClusterDatapath | null {
        if (config === null) {
            return null;
        }

        if (!config.flyingfish_libpath) {
            config.flyingfish_libpath = Config.DEFAULT_FF_DIR;
        }

        if (!config.clusterdatapath) {
            config.clusterdatapath = {
                port: Config.DEFAULT_CLUSTERDATAPATH_PORT
            };
        }

        return config;
    }

}