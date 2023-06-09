import process from 'process';
import {FlyingFishArgs} from '../Env/Args.js';
import {Config as ConfigCore} from 'flyingfish_core';
import {
    ConfigOptionsHimHip,
    SchemaConfigOptionsHimHip
} from 'flyingfish_schemas';


/**
 * env duty
 */
export enum ENV_DUTY {
    SECRET = 'FLYINGFISH_SECRET'
}

/**
 * env optional
 */
export enum ENV_OPTIONAL {
    URL_PATH = 'FLYINGFISH_URL_PATH',
    SERVER_HOST = 'FLYINGFISH_SERVER_HOST',
    SERVER_PORT = 'FLYINGFISH_SERVER_PORT',
    SERVER_PROTOCOL = 'FLYINGFISH_SERVER_PROTOCOL',
    LOGGING_LEVEL = 'FLYINGFISH_LOGGING_LEVEL'
}

/**
 * Config
 */
export class Config extends ConfigCore<ConfigOptionsHimHip> {

    public static readonly DEFAULT_URL_PATH = '/himhip/update';
    public static readonly DEFAULT_SERVER_HOST = '10.103.0.3';
    public static readonly DEFAULT_SERVER_PORT = 3000;
    public static readonly DEFAULT_SERVER_PROTOCOL = 'https';

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
        const config: ConfigOptionsHimHip = {
            secret: '',
            url_path: Config.DEFAULT_URL_PATH,
            server_host: Config.DEFAULT_SERVER_HOST,
            server_port: Config.DEFAULT_SERVER_PORT,
            server_protocol: Config.DEFAULT_SERVER_PROTOCOL
        };

        if (args.secret) {
            config.secret = args.secret;
        }

        if (args.url_path) {
            config.url_path = args.url_path;
        }

        if (args.server_host) {
            config.server_host = args.server_host;
        }

        if (args.server_port) {
            config.server_port = parseInt(
                args.server_port ??
                `${Config.DEFAULT_SERVER_PORT}`, 10
            );
        }

        if (args.server_protocol) {
            config.server_protocol = args.server_protocol;
        }

        if (args.envargs && args.envargs === '1') {
            for (const env of Object.values(ENV_DUTY)) {
                if (!process.env[env]) {
                    console.log(`Config::load: Env Variable "${env}" not found!`);
                    return null;
                }
            }

            config.secret = process.env[ENV_DUTY.SECRET] ?? '';

            // optional ----------------------------------------------------------------------------------------------------

            if (process.env[ENV_OPTIONAL.URL_PATH]) {
                config.url_path = process.env[ENV_OPTIONAL.URL_PATH];
            }

            if (process.env[ENV_OPTIONAL.SERVER_HOST]) {
                config.server_host = process.env[ENV_OPTIONAL.SERVER_HOST];
            }

            if (process.env[ENV_OPTIONAL.SERVER_PORT]) {
                config.server_port = parseInt(
                    process.env[ENV_OPTIONAL.SERVER_HOST] ??
                    `${Config.DEFAULT_SERVER_PORT}`, 10
                );
            }

            if (process.env[ENV_OPTIONAL.SERVER_PROTOCOL]) {
                config.server_protocol = process.env[ENV_OPTIONAL.SERVER_PROTOCOL];
            }

            if (process.env[ENV_OPTIONAL.LOGGING_LEVEL]) {
                config.logging = {
                    level: process.env[ENV_OPTIONAL.LOGGING_LEVEL]
                };
            }
        }

        this.set(config!);
        return config;
    }

}