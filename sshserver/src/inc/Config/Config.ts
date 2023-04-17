import {readFileSync} from 'fs';
import path from 'path';
import process from 'process';
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
        })
    }),
    flyingfish_libpath: Vts.optional(Vts.string()),
    flyingfish_sshpath: Vts.optional(Vts.string())
});

export type ConfigOptions = ExtractSchemaResultType<typeof SchemaConfigOptions>;

export enum ENV_DUTY {
    DB_MYSQL_USERNAME = 'FLYINGFISH_DB_MYSQL_USERNAME',
    DB_MYSQL_PASSWORD = 'FLYINGFISH_DB_MYSQL_PASSWORD',
    DB_MYSQL_DATABASE = 'FLYINGFISH_DB_MYSQL_DATABASE'
}

export enum ENV_OPTIONAL {
    DB_MYSQL_HOST = 'FLYINGFISH_DB_MYSQL_HOST',
    DB_MYSQL_PORT = 'FLYINGFISH_DB_MYSQL_PORT'
}

/**
 * Config
 */
export class Config {

    public static readonly DEFAULT_CONFIG_FILE = 'config.json';
    public static readonly DEFAULT_FF_DIR = path.join('/', 'var', 'lib', 'flyingfish');
    public static readonly DEFAULT_SSH_DIR = 'ssh';
    public static readonly DEFAULT_DB_MYSQL_HOST = '10.103.0.2';
    public static readonly DEFAULT_DB_MYSQL_PORT = 3306;

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
    static async load(
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
                    console.log(errors);

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
        }

        // -------------------------------------------------------------------------------------------------------------

        if (config) {
            if (config.flyingfish_libpath) {
                ffPath = config.flyingfish_libpath;
            } else {
                config.flyingfish_libpath = ffPath;
            }

            if (!config.flyingfish_sshpath) {
                config.flyingfish_sshpath = path.join(ffPath, Config.DEFAULT_SSH_DIR);
            }
        }

        return config;
    }

}