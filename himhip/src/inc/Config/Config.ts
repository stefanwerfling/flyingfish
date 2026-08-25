import process from 'process';
import {FlyingFishArgs} from '../Env/Args.js';
import {Config as ConfigCore} from 'flyingfish_core';
import {
    ConfigOptionsHimHip,
    ENV_OPTIONAL_DB,
    SchemaConfigOptionsHimHip
} from 'flyingfish_schemas';

/**
 * env optional
 */
export enum ENV_OPTIONAL {
    LOGGING_LEVEL = 'FLYINGFISH_LOGGING_LEVEL'
}

/**
 * Config
 */
export class Config extends ConfigCore<ConfigOptionsHimHip> {

    public static readonly DEFAULT_REDIS_URL = 'redis://10.103.0.7:6379';

    /**
     * getInstance
     */
    public static getInstance(): Config {
        if (!ConfigCore._instance) {
            ConfigCore._instance = new Config(SchemaConfigOptionsHimHip);
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