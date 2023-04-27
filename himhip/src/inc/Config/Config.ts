import process from 'process';
import {ExtractSchemaResultType, Vts} from 'vts';
import {FlyingFishArgs} from '../Env/Args.js';

export const SchemaConfigOptions = Vts.object({
    secret: Vts.string(),
    url_path: Vts.string(),
    server_host: Vts.string(),
    server_port: Vts.number(),
    server_protocol: Vts.string()
});

export type ConfigOptions = ExtractSchemaResultType<typeof SchemaConfigOptions>;

export enum ENV_DUTY {
    SECRET = 'FLYINGFISH_SECRET'
}

export enum ENV_OPTIONAL {
    URL_PATH = 'FLYINGFISH_URL_PATH',
    SERVER_HOST = 'FLYINGFISH_SERVER_HOST',
    SERVER_PORT = 'FLYINGFISH_SERVER_PORT',
    SERVER_PROTOCOL = 'FLYINGFISH_SERVER_PROTOCOL'
}

export class Config {

    public static readonly DEFAULT_URL_PATH = '/himhip/update';
    public static readonly DEFAULT_SERVER_HOST = '10.103.0.3';
    public static readonly DEFAULT_SERVER_PORT = 3000;
    public static readonly DEFAULT_SERVER_PROTOCOL = 'https';

    /**
     * global config
     * @private
     */
    private static _config: ConfigOptions | null = null;

    /**
     * set
     * @param config
     */
    public static set(config: ConfigOptions): void {
        this._config = config;
    }

    /**
     * get
     */
    public static get(): ConfigOptions | null {
        return this._config;
    }

    /**
     * load
     * @param args
     */
    public static async load(args: FlyingFishArgs): Promise<ConfigOptions | null> {
        const config: ConfigOptions = {
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
        }

        return config;
    }

}