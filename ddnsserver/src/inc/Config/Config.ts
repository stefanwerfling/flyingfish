import {Config as ConfigCore} from 'flyingfish_core';
import {DdnsServerConfigOptions, ENV_DUTY_DB, ENV_OPTIONAL_DB, SchemaDdnsServerConfigOptions} from 'flyingfish_schemas';
import process from 'process';

/**
 * Config
 */
export class Config extends ConfigCore<DdnsServerConfigOptions> {

    /**
     * getInstance
     */
    public static getInstance(): Config {
        if (!ConfigCore._instance) {
            ConfigCore._instance = new Config(SchemaDdnsServerConfigOptions);
        }

        return ConfigCore._instance as Config;
    }

    /**
     * _loadEnv
     * @param aConfig
     * @protected
     */
    protected _loadEnv(aConfig: DdnsServerConfigOptions | null): DdnsServerConfigOptions | null {
        let config = aConfig;

        // defaults ----------------------------------------------------------------------------------------------------

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

        // optional ----------------------------------------------------------------------------------------------------

        // db mysql ----------------------------------------------------------------------------------------------------

        if (process.env[ENV_OPTIONAL_DB.DB_MYSQL_HOST]) {
            config.db.mysql.host = process.env[ENV_OPTIONAL_DB.DB_MYSQL_HOST];
        }

        if (process.env[ENV_OPTIONAL_DB.DB_MYSQL_PORT]) {
            config.db.mysql.port = parseInt(process.env[ENV_OPTIONAL_DB.DB_MYSQL_PORT]!, 10) ||
                Config.DEFAULT_DB_MYSQL_PORT;
        }

        return config;
    }

}