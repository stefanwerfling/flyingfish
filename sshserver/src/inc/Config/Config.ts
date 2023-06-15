import {ConfigOptionsSshServer, ENV_DUTY_DB, ENV_OPTIONAL_DB, SchemaConfigOptionsSshServer} from 'flyingfish_schemas';
import path from 'path';
import process from 'process';
import {Config as ConfigCore} from 'flyingfish_core';

export enum ENV_OPTIONAL {
    LOGGING_LEVEL = 'FLYINGFISH_LOGGING_LEVEL'
}

/**
 * Config
 */
export class Config extends ConfigCore<ConfigOptionsSshServer> {

    /**
     * DEFAULTS
     */
    public static readonly DEFAULT_SSH_DIR = 'ssh';

    /**
     * getInstance
     */
    public static getInstance(): Config {
        if (!ConfigCore._instance) {
            ConfigCore._instance = new Config(SchemaConfigOptionsSshServer);
        }

        return ConfigCore._instance as Config;
    }

    /**
     * _loadEnv
     * @param aConfig
     * @protected
     */
    protected _loadEnv(aConfig: ConfigOptionsSshServer | null): ConfigOptionsSshServer | null {
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
    protected _setDefaults(config: ConfigOptionsSshServer | null): ConfigOptionsSshServer | null {
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