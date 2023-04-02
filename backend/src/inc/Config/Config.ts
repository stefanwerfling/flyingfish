import {readFileSync} from 'fs';
import * as Path from 'path';
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
        dhparamfile: Vts.optional(Vts.string())
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
    public static readonly DEFAULT_FF_DIR = '/var/lib/flyingfish';
    public static readonly DEFAULT_DB_MYSQL_HOST = '10.103.0.2';
    public static readonly DEFAULT_DB_MYSQL_PORT = 3306;
    public static readonly DEFAULT_HTTPSERVER_PORT = 3000;

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
     * @param useEnv
     */
    public static async load(configFile: string|null = null, useEnv: boolean = false): Promise<ConfigOptions | null> {
        let config: ConfigOptions|null = null;
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
                    console.log(errors);

                    return null;
                }

                config = fileConfig;
            } catch (err) {
                console.error(err);
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
                        publicdir: ''
                    }
                };
            }

            // variables -----------------------------------------------------------------------------------------------

            if (process.env[ENV_OPTIONAL.DB_MYSQL_HOST]) {
                config.db.mysql.host = process.env[ENV_OPTIONAL.DB_MYSQL_HOST];
            }

            if (process.env[ENV_OPTIONAL.DB_MYSQL_PORT]) {
                config.db.mysql.port = parseInt(process.env[ENV_OPTIONAL.DB_MYSQL_PORT]!, 10) || Config.DEFAULT_DB_MYSQL_PORT;
            }

            if (process.env[ENV_OPTIONAL.HTTPSERVER_PORT]) {
                config.httpserver.port = parseInt(process.env[ENV_OPTIONAL.HTTPSERVER_PORT]!, 10) || Config.DEFAULT_HTTPSERVER_PORT;
            }

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
        }

        return config;
    }

}