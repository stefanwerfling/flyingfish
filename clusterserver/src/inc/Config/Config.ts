import {Config as ConfigCore} from '@stefanwerfling/figtree';
import {ConfigOptionsClusterServer, SchemaConfigOptionsClusterServer} from 'flyingfish_schemas';
import path from 'path';
import process from 'process';

/**
 * ENV_OPTIONAL
 */
export enum ENV_OPTIONAL {
    LOGGING_LEVEL = 'FLYINGFISH_LOGGING_LEVEL',
    CLUSTERSERVER_PORT = 'FLYINGFISH_CLUSTERSERVER_PORT',
    REGISTRY_URL = 'FLYINGFISH_REGISTRY_URL',
    REGISTRY_SECRET = 'FLYINGFISH_REGISTRY_SECRET',
    PKI_URL = 'FLYINGFISH_PKI_URL',
    PKI_BOOTSTRAP_TOKEN = 'FLYINGFISH_PKI_BOOTSTRAP_TOKEN',
    PKI_BOOTSTRAP_SOCKET = 'FLYINGFISH_PKI_BOOTSTRAP_SOCKET',
    PKI_STORE_DIR = 'FLYINGFISH_PKI_STORE_DIR'
}

/**
 * Config — the cluster control part is database-free, so its config only needs an
 * HTTP port plus the optional Hub registry and node PKI blocks.
 */
export class Config extends ConfigCore<ConfigOptionsClusterServer> {

    /**
     * FlyingFish infrastructure defaults, re-declared here now that this Config
     * extends figtree's generic `Config`.
     */
    public static readonly DEFAULT_FF_DIR = path.join('/', 'var', 'lib', 'flyingfish');
    public static readonly DEFAULT_CLUSTERSERVER_PORT = 5335;
    public static readonly DEFAULT_CONFIG_FILE = 'config.json';

    /**
     * getInstance
     */
    public static override getInstance(): Config {
        if (!ConfigCore._instance) {
            const instance = new Config(SchemaConfigOptionsClusterServer);
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
    protected override _loadEnv(aConfig: ConfigOptionsClusterServer | null): ConfigOptionsClusterServer | null {
        let config = aConfig;

        if (config === null) {
            config = {
                clusterserver: {
                    port: Config.DEFAULT_CLUSTERSERVER_PORT
                }
            };
        }

        // cluster server port -----------------------------------------------------------------------------------------

        if (process.env[ENV_OPTIONAL.CLUSTERSERVER_PORT]) {
            if (!config.clusterserver) {
                config.clusterserver = {};
            }

            config.clusterserver.port = parseInt(process.env[ENV_OPTIONAL.CLUSTERSERVER_PORT]!, 10) ||
                Config.DEFAULT_CLUSTERSERVER_PORT;
        }

        // Logging -----------------------------------------------------------------------------------------------------

        if (process.env[ENV_OPTIONAL.LOGGING_LEVEL]) {
            config.logging = {
                level: process.env[ENV_OPTIONAL.LOGGING_LEVEL]
            };
        }

        // Hub registry (v2): both url and secret required to self-register.
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

        return config;
    }

    /**
     * _setDefaults
     * @param config
     * @protected
     */
    protected override _setDefaults(config: ConfigOptionsClusterServer | null): ConfigOptionsClusterServer | null {
        if (config === null) {
            return null;
        }

        if (!config.flyingfish_libpath) {
            config.flyingfish_libpath = Config.DEFAULT_FF_DIR;
        }

        if (!config.clusterserver) {
            config.clusterserver = {
                port: Config.DEFAULT_CLUSTERSERVER_PORT
            };
        }

        return config;
    }

}