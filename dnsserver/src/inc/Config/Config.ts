import {Config as ConfigCore} from 'figtree';
import {ConfigOptionsDnsServer, ENV_DUTY_DB, ENV_OPTIONAL_DB, SchemaConfigOptionsDnsServer} from 'flyingfish_schemas';
import path from 'path';
import process from 'process';

/**
 * ENV_OPTIONAL
 */
export enum ENV_OPTIONAL {
    LOGGING_LEVEL = 'FLYINGFISH_LOGGING_LEVEL',
    DNSSERVER_PORT = 'FLYINGFISH_DNSSERVER_PORT',
    REGISTRY_URL = 'FLYINGFISH_REGISTRY_URL',
    REGISTRY_SECRET = 'FLYINGFISH_REGISTRY_SECRET'
}

/**
 * Config
 */
export class Config extends ConfigCore<ConfigOptionsDnsServer> {

    /**
     * FlyingFish infrastructure defaults, re-declared here now that this Config
     * extends figtree's generic `Config`.
     */
    public static readonly DEFAULT_DB_MYSQL_HOST = '10.103.0.2';
    public static readonly DEFAULT_DB_MYSQL_PORT = 3306;
    public static readonly DEFAULT_FF_DIR = path.join('/', 'var', 'lib', 'flyingfish');
    public static readonly DEFAULT_DNSSERVER_PORT = 5333;
    public static readonly DEFAULT_CONFIG_FILE = 'config.json';

    /**
     * getInstance
     */
    public static override getInstance(): Config {
        if (!ConfigCore._instance) {
            const instance = new Config(SchemaConfigOptionsDnsServer);
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
    protected override _loadEnv(aConfig: ConfigOptionsDnsServer | null): ConfigOptionsDnsServer | null {
        let config = aConfig;

        if (config) {
            if (process.env[ENV_DUTY_DB.DB_MYSQL_USERNAME]) {
                config.db.mysql.username = process.env[ENV_DUTY_DB.DB_MYSQL_USERNAME];
            }

            if (process.env[ENV_DUTY_DB.DB_MYSQL_PASSWORD]) {
                config.db.mysql.password = process.env[ENV_DUTY_DB.DB_MYSQL_PASSWORD];
            }

            if (process.env[ENV_DUTY_DB.DB_MYSQL_DATABASE]) {
                config.db.mysql.database = process.env[ENV_DUTY_DB.DB_MYSQL_DATABASE];
            }
        } else {
            for (const env of Object.values(ENV_DUTY_DB)) {
                if (!process.env[env]) {
                    console.log(`Config::load: Env Variable "${env}" not found!`);
                    return null;
                }
            }

            const dbMysqlUsername = process.env[ENV_DUTY_DB.DB_MYSQL_USERNAME]!;
            const dbMysqlPassword = process.env[ENV_DUTY_DB.DB_MYSQL_PASSWORD]!;
            const dbMysqlDatabase = process.env[ENV_DUTY_DB.DB_MYSQL_DATABASE]!;

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
                dnsserver: {
                    port: Config.DEFAULT_DNSSERVER_PORT
                }
            };
        }

        // db mysql (optional) -----------------------------------------------------------------------------------------

        if (process.env[ENV_OPTIONAL_DB.DB_MYSQL_HOST]) {
            config.db.mysql.host = process.env[ENV_OPTIONAL_DB.DB_MYSQL_HOST];
        }

        if (process.env[ENV_OPTIONAL_DB.DB_MYSQL_PORT]) {
            config.db.mysql.port = parseInt(process.env[ENV_OPTIONAL_DB.DB_MYSQL_PORT]!, 10) ||
                Config.DEFAULT_DB_MYSQL_PORT;
        }

        // dns server port ---------------------------------------------------------------------------------------------

        if (process.env[ENV_OPTIONAL.DNSSERVER_PORT]) {
            if (!config.dnsserver) {
                config.dnsserver = {};
            }

            config.dnsserver.port = parseInt(process.env[ENV_OPTIONAL.DNSSERVER_PORT]!, 10) ||
                Config.DEFAULT_DNSSERVER_PORT;
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

        return config;
    }

    /**
     * _setDefaults
     * @param config
     * @protected
     */
    protected override _setDefaults(config: ConfigOptionsDnsServer | null): ConfigOptionsDnsServer | null {
        if (config === null) {
            return null;
        }

        if (!config.flyingfish_libpath) {
            config.flyingfish_libpath = Config.DEFAULT_FF_DIR;
        }

        if (!config.dnsserver) {
            config.dnsserver = {
                port: Config.DEFAULT_DNSSERVER_PORT
            };
        }

        return config;
    }

}