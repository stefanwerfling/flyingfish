import {Config as ConfigCore} from 'figtree';
import path from 'path';
import process from 'process';
import {FlyingFishArgs} from '../Env/Args.js';
import {
    ConfigOptionsHimHip,
    ENV_OPTIONAL_DB,
    SchemaConfigOptionsHimHip
} from 'flyingfish_schemas';

/**
 * env optional
 */
export enum ENV_OPTIONAL {
    LOGGING_LEVEL = 'FLYINGFISH_LOGGING_LEVEL',
    REGISTRY_URL = 'FLYINGFISH_REGISTRY_URL',
    REGISTRY_SECRET = 'FLYINGFISH_REGISTRY_SECRET',
    PKI_URL = 'FLYINGFISH_PKI_URL',
    PKI_BOOTSTRAP_TOKEN = 'FLYINGFISH_PKI_BOOTSTRAP_TOKEN',
    PKI_BOOTSTRAP_SOCKET = 'FLYINGFISH_PKI_BOOTSTRAP_SOCKET',
    PKI_STORE_DIR = 'FLYINGFISH_PKI_STORE_DIR'
}

/**
 * Config
 */
export class Config extends ConfigCore<ConfigOptionsHimHip> {

    public static readonly DEFAULT_REDIS_URL = 'redis://10.103.0.7:6379';
    public static readonly DEFAULT_FF_DIR = path.join('/', 'var', 'lib', 'flyingfish');

    /**
     * getInstance
     */
    public static override getInstance(): Config {
        if (!ConfigCore._instance) {
            const instance = new Config(SchemaConfigOptionsHimHip);
            instance.setAppName('flyingfish');
            ConfigCore._instance = instance;
        }

        return ConfigCore._instance as Config;
    }

    /**
     * load
     * @param args
     */
    public async load2(args: FlyingFishArgs): Promise<ConfigOptionsHimHip | null> {
        let config: ConfigOptionsHimHip = {
            redis: {
                url: Config.DEFAULT_REDIS_URL
            }
        };

        if (args.envargs && args.envargs === '1') {
            if (process.env[ENV_OPTIONAL.LOGGING_LEVEL]) {
                config.logging = {
                    level: process.env[ENV_OPTIONAL.LOGGING_LEVEL]
                };
            }

            config = this._loadEnvRedisDb(config);

            // Hub registry (v2): both url and secret required to self-register.
            if (process.env[ENV_OPTIONAL.REGISTRY_URL] && process.env[ENV_OPTIONAL.REGISTRY_SECRET]) {
                config.registry = {
                    url: process.env[ENV_OPTIONAL.REGISTRY_URL]!,
                    secret: process.env[ENV_OPTIONAL.REGISTRY_SECRET]!
                };
            }

            // Node PKI (v2): url + a bootstrap token OR a bootstrap socket to fetch
            // one from are required to enroll; store dir optional.
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
        }

        this.set(config);
        return config;
    }

    /**
     * Load Redis Env
     * @param {ConfigOptionsHimHip} config
     * @returns {ConfigOptionsHimHip}
     * @protected
     */
    protected _loadEnvRedisDb(config: ConfigOptionsHimHip): ConfigOptionsHimHip {
        if (config.redis) {
            if (process.env[ENV_OPTIONAL_DB.DB_REDIS_URL]) {
                config.redis.url = process.env[ENV_OPTIONAL_DB.DB_REDIS_URL];
            }

            if (process.env[ENV_OPTIONAL_DB.DB_REDIS_PASSWORD]) {
                config.redis.password = process.env[ENV_OPTIONAL_DB.DB_REDIS_PASSWORD];
            }
        }

        return config;
    }

}