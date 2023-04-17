import {readFileSync} from 'fs';
import path from 'path';
import * as process from 'process';
import {ExtractSchemaResultType, SchemaErrors, Vts} from 'vts';

/**
 * ConfigOptions
 */
export const SchemaConfigOptions = Vts.object({
    db: Vts.object({
        mysql: Vts.object({
            host: Vts.string(),
            port: Vts.number(),
            username: Vts.string(),
            password: Vts.string(),
            database: Vts.string()
        }),
        influx: Vts.optional(Vts.object({
            url: Vts.string(),
            token: Vts.string(),
            org: Vts.string(),
            bucket: Vts.string(),
            username: Vts.string(),
            password: Vts.string()
        }))
    }),
    httpserver: Vts.object({
        port: Vts.optional(Vts.number()),
        publicdir: Vts.string(),
        session: Vts.optional(Vts.object({
            secret: Vts.optional(Vts.string()),
            cookie_path: Vts.optional(Vts.string()),
            cookie_max_age: Vts.optional(Vts.number())
        })),
        sslpath: Vts.optional(Vts.string())
    }),
    nginx: Vts.optional(Vts.object({
        config: Vts.string(),
        prefix: Vts.string(),
        dhparamfile: Vts.optional(Vts.string()),
        module_mode_dyn: Vts.optional(Vts.boolean())
    })),
    sshserver: Vts.optional(Vts.object({
        ip: Vts.string()
    })),
    docker: Vts.optional(Vts.object({
        inside: Vts.boolean(),
        gateway: Vts.optional(Vts.string())
    })),
    upnpnat: Vts.optional(Vts.object({
        enable: Vts.boolean()
    })),
    dyndnsclient: Vts.optional(Vts.object({
        enable: Vts.boolean()
    })),
    dnsserver: Vts.optional(Vts.object({
        port: Vts.optional(Vts.number())
    })),
    himpip: Vts.optional(Vts.object({
        provider: Vts.string()
    })),
    himhip: Vts.optional(Vts.object({
        use: Vts.boolean(),
        secure: Vts.string()
    })),
    logging: Vts.optional(Vts.object({
        dirname: Vts.optional(Vts.string()),
        filename: Vts.optional(Vts.string()),
        zippedArchive: Vts.optional(Vts.boolean()),
        maxSize: Vts.optional(Vts.string()),
        maxFiles: Vts.optional(Vts.string()),
        enableConsole: Vts.optional(Vts.boolean()),
        level: Vts.optional(Vts.string())
    })),
    flyingfish_libpath: Vts.optional(Vts.string())
});

export type ConfigOptions = ExtractSchemaResultType<typeof SchemaConfigOptions>;

export enum ENV_DUTY {
    DB_MYSQL_USERNAME = 'FLYINGFISH_DB_MYSQL_USERNAME',
    DB_MYSQL_PASSWORD = 'FLYINGFISH_DB_MYSQL_PASSWORD',
    DB_MYSQL_DATABASE = 'FLYINGFISH_DB_MYSQL_DATABASE'
}

export enum ENV_OPTIONAL {
    DB_MYSQL_HOST = 'FLYINGFISH_DB_MYSQL_HOST',
    DB_MYSQL_PORT = 'FLYINGFISH_DB_MYSQL_PORT',
    HTTPSERVER_PORT = 'FLYINGFISH_HTTPSERVER_PORT',
    HTTPSERVER_PUBLICDIR = 'FLYINGFISH_HTTPSERVER_PUBLICDIR',
    DNSSERVER_PORT = 'FLYINGFISH_DNSSERVER_PORT',
    NGINX_CONFIG = 'FLYINGFISH_NGINX_CONFIG',
    NGINX_PREFIX = 'FLYINGFISH_NGINX_PREFIX',
    NGINX_MODULE_MODE_DYN = 'FLYINGFISH_NGINX_MODULE_MODE_DYN',
    SSHSERVER_IP = 'FLYINGFISH_SSHSERVER_IP',
    DOCKER_INSIDE = 'FLYINGFISH_DOCKER_INSIDE',
    LOGGING_LEVEL = 'FLYINGFISH_LOGGING_LEVEL',
    HIMHIP_USE = 'FLYINGFISH_HIMHIP_USE',
    HIMHIP_SECURE = 'FLYINGFISH_HIMHIP_SECURE',
    FF_LIBPATH = 'FLYINGFISH_LIBPATH'
}

/**
 * Config
 */
export class Config {

    /**
     * DEFAULTS
     */
    public static readonly DEFAULT_CONFIG_FILE = 'config.json';
    public static readonly DEFAULT_FF_DIR = path.join('/', 'var', 'lib', 'flyingfish');
    public static readonly DEFAULT_DB_MYSQL_HOST = '10.103.0.2';
    public static readonly DEFAULT_DB_MYSQL_PORT = 3306;
    public static readonly DEFAULT_HTTPSERVER_PORT = 3000;
    public static readonly DEFAULT_HTTPSERVER_PUBLICDIR = 'frontend';
    public static readonly DEFAULT_DNSSERVER_PORT = 5333;
    public static readonly DEFAULT_NGINX_CONFIG = path.join('/', 'opt', 'app', 'nginx', 'nginx.conf');
    public static readonly DEFAULT_NGINX_PREFIX = path.join('/', 'opt', 'app', 'nginx');
    public static readonly DEFAULT_SSHSERVER_IP = '10.103.0.4';
    public static readonly DEFAULT_DOCKER_GATEWAY = '10.103.0.1';
    public static readonly DEFAULT_HIMHIP_USE = true;
    public static readonly DEFAULT_HIMHIP_SECURE = '';

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
     * @param configFile
     * @param useEnv
     */
    public static async load(
        configFile: string | null = null,
        useEnv: boolean = false
    ): Promise<ConfigOptions | null> {
        let config: ConfigOptions | null = null;
        let ffPath = Config.DEFAULT_FF_DIR;

        if (configFile) {
            try {
                const rawdata = readFileSync(configFile, {
                    // @ts-ignore
                    encoding: 'utf-8'
                });

                console.log(`Config::load: Load json-file: ${configFile}`);

                const fileConfig = JSON.parse(rawdata) as ConfigOptions;
                const errors: SchemaErrors = [];

                if (!SchemaConfigOptions.validate(fileConfig, errors)) {
                    console.log('Config::load: Config file error:');
                    console.log(JSON.stringify(errors, null, 2));

                    return null;
                }

                config = fileConfig;
            } catch (err) {
                console.error(err);
                return null;
            }
        }

        // -------------------------------------------------------------------------------------------------------------

        // env can overwrite config file
        if (useEnv) {
            // defaults ------------------------------------------------------------------------------------------------
            if (config) {
                if (process.env[ENV_DUTY.DB_MYSQL_USERNAME]) {
                    config.db.mysql.username = process.env[ENV_DUTY.DB_MYSQL_USERNAME];
                }

                if (process.env[ENV_DUTY.DB_MYSQL_PASSWORD]) {
                    config.db.mysql.password = process.env[ENV_DUTY.DB_MYSQL_PASSWORD];
                }

                if (process.env[ENV_DUTY.DB_MYSQL_DATABASE]) {
                    config.db.mysql.database = process.env[ENV_DUTY.DB_MYSQL_DATABASE];
                }
            } else {
                for (const env of Object.values(ENV_DUTY)) {
                    if (!process.env[env]) {
                        console.log(`Config::load: Env Variable "${env}" not found!`);
                        return null;
                    }
                }

                const dbMysqlUsername = process.env[ENV_DUTY.DB_MYSQL_USERNAME]!;
                const dbMysqlPassword = process.env[ENV_DUTY.DB_MYSQL_PASSWORD]!;
                const dbMysqlDatabase = process.env[ENV_DUTY.DB_MYSQL_DATABASE]!;

                config = {
                    db: {
                        mysql: {
                            host: Config.DEFAULT_DB_MYSQL_HOST,
                            port: Config.DEFAULT_DB_MYSQL_PORT,
                            username: dbMysqlUsername,
                            password: dbMysqlPassword,
                            database: dbMysqlDatabase
                        }
                    },
                    httpserver: {
                        port: Config.DEFAULT_HTTPSERVER_PORT,
                        publicdir: Config.DEFAULT_HTTPSERVER_PUBLICDIR
                    },
                    nginx: {
                        config: Config.DEFAULT_NGINX_CONFIG,
                        prefix: Config.DEFAULT_NGINX_PREFIX
                    },
                    himhip: {
                        use: Config.DEFAULT_HIMHIP_USE,
                        secure: Config.DEFAULT_HIMHIP_SECURE
                    }
                };
            }

            // optional ------------------------------------------------------------------------------------------------

            // db mysql ------------------------------------------------------------------------------------------------

            if (process.env[ENV_OPTIONAL.DB_MYSQL_HOST]) {
                config.db.mysql.host = process.env[ENV_OPTIONAL.DB_MYSQL_HOST];
            }

            if (process.env[ENV_OPTIONAL.DB_MYSQL_PORT]) {
                config.db.mysql.port = parseInt(process.env[ENV_OPTIONAL.DB_MYSQL_PORT]!, 10) ||
                    Config.DEFAULT_DB_MYSQL_PORT;
            }

            // httpserver ----------------------------------------------------------------------------------------------

            if (process.env[ENV_OPTIONAL.HTTPSERVER_PORT]) {
                config.httpserver.port = parseInt(process.env[ENV_OPTIONAL.HTTPSERVER_PORT]!, 10) ||
                    Config.DEFAULT_HTTPSERVER_PORT;
            }

            if (process.env[ENV_OPTIONAL.HTTPSERVER_PUBLICDIR]) {
                config.httpserver.publicdir = process.env[ENV_OPTIONAL.HTTPSERVER_PUBLICDIR];
            }

            // dnsserver -----------------------------------------------------------------------------------------------

            if (process.env[ENV_OPTIONAL.DNSSERVER_PORT]) {
                config.dnsserver = {
                    port: parseInt(process.env[ENV_OPTIONAL.DNSSERVER_PORT]!, 10) || Config.DEFAULT_DNSSERVER_PORT
                };
            }

            // nginx ---------------------------------------------------------------------------------------------------

            if (!config.nginx) {
                config.nginx = {
                    config: Config.DEFAULT_NGINX_CONFIG,
                    prefix: Config.DEFAULT_NGINX_PREFIX
                };
            }

            if (process.env[ENV_OPTIONAL.NGINX_CONFIG]) {
                config.nginx.config = process.env[ENV_OPTIONAL.NGINX_CONFIG];
            }

            if (process.env[ENV_OPTIONAL.NGINX_PREFIX]) {
                config.nginx.prefix = process.env[ENV_OPTIONAL.NGINX_PREFIX];
            }

            if (process.env[ENV_OPTIONAL.NGINX_MODULE_MODE_DYN]) {
                config.nginx.module_mode_dyn = process.env[ENV_OPTIONAL.NGINX_MODULE_MODE_DYN] === '1';
            }

            // sshserver -----------------------------------------------------------------------------------------------

            if (process.env[ENV_OPTIONAL.SSHSERVER_IP]) {
                config.sshserver = {
                    ip: process.env[ENV_OPTIONAL.SSHSERVER_IP]
                };
            }

            // docker --------------------------------------------------------------------------------------------------

            if (process.env[ENV_OPTIONAL.DOCKER_INSIDE]) {
                config.docker = {
                    inside: process.env[ENV_OPTIONAL.DOCKER_INSIDE] === '1',
                    gateway: Config.DEFAULT_DOCKER_GATEWAY
                };
            }

            if (process.env[ENV_OPTIONAL.LOGGING_LEVEL]) {
                config.logging = {
                    level: process.env[ENV_OPTIONAL.LOGGING_LEVEL]
                };
            }

            // himhip --------------------------------------------------------------------------------------------------

            if (!config.himhip) {
                config.himhip = {
                    use: Config.DEFAULT_HIMHIP_USE,
                    secure: Config.DEFAULT_HIMHIP_SECURE
                };
            }

            if (process.env[ENV_OPTIONAL.HIMHIP_USE]) {
                config.himhip.use = process.env[ENV_OPTIONAL.HIMHIP_USE] === '1';
            }

            if (process.env[ENV_OPTIONAL.HIMHIP_SECURE]) {
                config.himhip.secure = process.env[ENV_OPTIONAL.HIMHIP_SECURE];
            }

            // ff ------------------------------------------------------------------------------------------------------

            if (process.env[ENV_OPTIONAL.FF_LIBPATH]) {
                config.flyingfish_libpath = process.env[ENV_OPTIONAL.FF_LIBPATH];
            }
        }

        // -------------------------------------------------------------------------------------------------------------

        if (config) {
            if (config.flyingfish_libpath) {
                ffPath = config.flyingfish_libpath;
            } else {
                config.flyingfish_libpath = ffPath;
            }

            if (!config.httpserver.sslpath) {
                config.httpserver.sslpath = path.join(ffPath, 'ssl');
            }

            // default dhparam
            if (config.nginx) {
                config.nginx.dhparamfile = path.join(ffPath, 'nginx', 'dhparam.pem');
            }

            if (!config.dnsserver) {
                config.dnsserver = {
                    port: Config.DEFAULT_DNSSERVER_PORT
                };
            }

            if (!config.sshserver) {
                config.sshserver = {
                    ip: Config.DEFAULT_SSHSERVER_IP
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
        }

        return config;
    }

}