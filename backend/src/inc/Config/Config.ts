import {readFileSync} from 'fs';
import path from 'path';

/**
 * ConfigOptions
 */
interface ConfigOptions {
    db: {
        mysql: {
            host: string;
            port: number;
            username: string;
            password: string;
            database: string;
        };
    };
    httpserver: {
        port?: number;
        publicdir: string;
        session?: {
            secret?: string;
            cookie_path?: string;
            cookie_max_age?: number;
        };
    };
    nginx?: {
        config: string;
        prefix: string;
    };
    sshserver?: {
        ip: string;
    };
    openssl?: {
        dhparamfile: string;
    };

    rootconfigpath?: string;
    rootconfigname?: string;
}

/**
 * Config
 */
export class Config {

    /**
     * DEFAULTS
     */
    public static readonly DEFAULT_CONFIG_FILE = 'config.json';

    /**
     * global config
     * @private
     */
    private static _config: ConfigOptions|null = null;

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
    public static get(): ConfigOptions|null {
        return this._config;
    }

    /**
     * load
     * @param configFile
     */
    public static async load(configFile: string): Promise<ConfigOptions | null> {
        let config = null;

        try {
            const rawdata = readFileSync(configFile, {
                // @ts-ignore
                encoding: 'utf-8'
            });

            console.log(`Load json-file: ${configFile}`);

            config = JSON.parse(rawdata) as ConfigOptions;

            config.rootconfigpath = path.dirname(configFile);
            config.rootconfigname = path.basename(configFile);
            config.openssl = {
                dhparamfile: '/opt/app/nginx/dhparam.pem'
            };

        } catch (err) {
            console.error(err);
        }

        return config;
    }

}