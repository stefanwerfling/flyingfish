import {Config as ConfigCore} from 'figtree';
import {ConfigOptionsSshServer, ENV_DUTY_DB, ENV_OPTIONAL_DB, SchemaConfigOptionsSshServer} from 'flyingfish_schemas';
import path from 'path';
import process from 'process';

export enum ENV_OPTIONAL {
    LOGGING_LEVEL = 'FLYINGFISH_LOGGING_LEVEL'
}

/**
 * Config
 *
 * Built on figtree's `Config`, typed with FlyingFish's own
 * `ConfigOptionsSshServer` (structurally assignable to figtree's
 * `ConfigOptions`). Seating this as figtree's `Config` singleton lets the
 * figtree `Logger` read this service's `logging` settings. The FlyingFish
 * infrastructure defaults (previously carried by flyingfish_core's `Config`)
 * are re-declared here, and the app name keeps the former `/var/log/flyingfish`
 * log path.
 */
export class Config extends ConfigCore<ConfigOptionsSshServer> {

    /**
     * DEFAULTS
     */
    public static readonly DEFAULT_DB_MYSQL_HOST = '10.103.0.2';
    public static readonly DEFAULT_DB_MYSQL_PORT = 3306;
    public static readonly DEFAULT_FF_DIR = path.join('/', 'var', 'lib', 'flyingfish');
    public static readonly DEFAULT_SSH_DIR = 'ssh';

    /**
     * getInstance
     */
    public static override getInstance(): Config {
        if (!ConfigCore._instance) {
            const instance = new Config(SchemaConfigOptionsSshServer);
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
    protected override _loadEnv(aConfig: ConfigOptionsSshServer | null): ConfigOptionsSshServer | null {
        let config = aConfig;

        // defaults ------------------------------------------------------------------------------------------------
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
                }
            };
        }

        // optional ------------------------------------------------------------------------------------------------

        // db mysql ------------------------------------------------------------------------------------------------

        if (process.env[ENV_OPTIONAL_DB.DB_MYSQL_HOST]) {
            config.db.mysql.host = process.env[ENV_OPTIONAL_DB.DB_MYSQL_HOST];
        }

        if (process.env[ENV_OPTIONAL_DB.DB_MYSQL_PORT]) {
            config.db.mysql.port = parseInt(process.env[ENV_OPTIONAL_DB.DB_MYSQL_PORT]!, 10) ||
                Config.DEFAULT_DB_MYSQL_PORT;
        }

        // db redis (optional) -------------------------------------------------------------------------------------
        // Enables the SSH config-change IPC subscriber; absent means DB-only.

        if (process.env[ENV_OPTIONAL_DB.DB_REDIS_URL]) {
            config.db.redis = {
                url: process.env[ENV_OPTIONAL_DB.DB_REDIS_URL]
            };

            if (process.env[ENV_OPTIONAL_DB.DB_REDIS_PASSWORD]) {
                config.db.redis.password = process.env[ENV_OPTIONAL_DB.DB_REDIS_PASSWORD];
            }
        }

        if (process.env[ENV_OPTIONAL.LOGGING_LEVEL]) {
            config.logging = {
                level: process.env[ENV_OPTIONAL.LOGGING_LEVEL]
            };
        }

        return config;
    }

    /**
     * _setDefaults
     * @param config
     * @protected
     */
    protected override _setDefaults(config: ConfigOptionsSshServer | null): ConfigOptionsSshServer | null {
        if (config === null) {
            return null;
        }

        let ffPath = Config.DEFAULT_FF_DIR;

        if (config.flyingfish_libpath) {
            ffPath = config.flyingfish_libpath;
        } else {
            config.flyingfish_libpath = ffPath;
        }

        if (!config.flyingfish_sshpath) {
            config.flyingfish_sshpath = path.join(ffPath, Config.DEFAULT_SSH_DIR);
        }

        return config;
    }

}