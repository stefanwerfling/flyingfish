import {readFileSync} from 'fs';
import * as Path from 'path';

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
        sslpath?: string;
    };
    nginx?: {
        config: string;
        prefix: string;
        dhparamfile?: string;
    };
    sshserver?: {
        ip: string;
    };
    docker?: {
        inside: boolean;
        gateway?: string;
    };
    upnpnat?: {
        enable: boolean;
    };
    dyndnsclient?: {
        enable: boolean;
    };
    dnsserver?: {
        port?: number;
    };
    // how is my provider ip
    himpip?: {
        provider: string;
    };
    // how is my host ip
    himhip?: {
        use: boolean;
        secure: string;
    };
    logging?: {
        dirname?: string;
        filename?: string;
        zippedArchive?: boolean;
        maxSize?: string;
        maxFiles?: string;
        enableConsole?: boolean;
        level?: string;
    };

    flyingfish_libpath?: string;
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
    public static readonly DEFAULT_FF_DIR = '/var/lib/flyingfish';

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

            let ffPath = Config.DEFAULT_FF_DIR;

            if (config.flyingfish_libpath) {
                ffPath = config.flyingfish_libpath;
            } else {
                config.flyingfish_libpath = ffPath;
            }

            // default paths
            config.rootconfigpath = Path.dirname(configFile);
            config.rootconfigname = Path.basename(configFile);

            // default httpserver
            if (!config.httpserver) {
                config.httpserver = {
                    port: 3000,
                    publicdir: ''
                };
            }

            if (!config.httpserver.sslpath) {
                config.httpserver.sslpath = Path.join(ffPath, 'ssl/');
            }

            // default dhparam
            if (config.nginx) {
                config.nginx.dhparamfile = Path.join(ffPath, 'nginx/dhparam.pem');
            }

            if (!config.dnsserver) {
                config.dnsserver = {
                    port: 5333
                };
            }

            // upnpnat enable
            if (!config.upnpnat) {
                config.upnpnat = {
                    enable: true
                };
            }

            // dyndnsclient enable
            if (!config.dyndnsclient) {
                config.dyndnsclient = {
                    enable: true
                };
            }

            // himpip provider
            if (!config.himpip) {
                config.himpip = {
                    provider: 'ipify'
                };
            }
        } catch (err) {
            console.error(err);
        }

        return config;
    }

}