import {Config as ConfigCore} from '@stefanwerfling/figtree';
import {ConfigOptionsNetfilter, SchemaConfigOptionsNetfilter} from 'flyingfish_schemas';
import path from 'path';
import process from 'process';

/**
 * ENV_OPTIONAL
 */
export enum ENV_OPTIONAL {
    LOGGING_LEVEL = 'FLYINGFISH_LOGGING_LEVEL',
    NETFILTER_RECONCILE_INTERVAL_MS = 'FLYINGFISH_NETFILTER_RECONCILE_INTERVAL_MS',
    REGISTRY_URL = 'FLYINGFISH_REGISTRY_URL',
    REGISTRY_SECRET = 'FLYINGFISH_REGISTRY_SECRET',
    PKI_URL = 'FLYINGFISH_PKI_URL',
    PKI_BOOTSTRAP_TOKEN = 'FLYINGFISH_PKI_BOOTSTRAP_TOKEN',
    PKI_BOOTSTRAP_SOCKET = 'FLYINGFISH_PKI_BOOTSTRAP_SOCKET',
    PKI_STORE_DIR = 'FLYINGFISH_PKI_STORE_DIR'
}

/**
 * Config — the netfilter/NAT router part is database-free; its config needs the Hub
 * registry (to register + pull the resolved config), the node PKI block and a
 * reconcile interval.
 */
export class Config extends ConfigCore<ConfigOptionsNetfilter> {

    /**
     * FlyingFish infrastructure defaults.
     */
    public static readonly DEFAULT_FF_DIR = path.join('/', 'var', 'lib', 'flyingfish');
    public static readonly DEFAULT_RECONCILE_INTERVAL_MS = 30000;
    public static readonly DEFAULT_CONFIG_FILE = 'config.json';

    /**
     * getInstance
     */
    public static override getInstance(): Config {
        if (!ConfigCore._instance) {
            const instance = new Config(SchemaConfigOptionsNetfilter);
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
    protected override _loadEnv(aConfig: ConfigOptionsNetfilter | null): ConfigOptionsNetfilter | null {
        let config = aConfig;

        if (config === null) {
            config = {
                netfilter: {
                    reconcileIntervalMs: Config.DEFAULT_RECONCILE_INTERVAL_MS
                }
            };
        }

        // reconcile interval ------------------------------------------------------------------------------------------

        if (process.env[ENV_OPTIONAL.NETFILTER_RECONCILE_INTERVAL_MS]) {
            if (!config.netfilter) {
                config.netfilter = {};
            }

            config.netfilter.reconcileIntervalMs = parseInt(process.env[ENV_OPTIONAL.NETFILTER_RECONCILE_INTERVAL_MS]!, 10) ||
                Config.DEFAULT_RECONCILE_INTERVAL_MS;
        }

        // Logging -----------------------------------------------------------------------------------------------------

        if (process.env[ENV_OPTIONAL.LOGGING_LEVEL]) {
            config.logging = {
                level: process.env[ENV_OPTIONAL.LOGGING_LEVEL]
            };
        }

        // Hub registry (v2): both url and secret required to register + pull config.
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
    protected override _setDefaults(config: ConfigOptionsNetfilter | null): ConfigOptionsNetfilter | null {
        if (config === null) {
            return null;
        }

        if (!config.flyingfish_libpath) {
            config.flyingfish_libpath = Config.DEFAULT_FF_DIR;
        }

        if (!config.netfilter) {
            config.netfilter = {
                reconcileIntervalMs: Config.DEFAULT_RECONCILE_INTERVAL_MS
            };
        }

        return config;
    }

}