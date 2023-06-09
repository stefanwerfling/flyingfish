import {ConfigOptions, SchemaConfigOptions} from 'flyingfish_schemas';
import {readFileSync} from 'fs';
import {SchemaErrors} from 'vts';
import {ObjectSchema} from 'vts/dist/schemas/objectSchema.js';

/**
 * Config
 */
export class Config<T = ConfigOptions> {

    /**
     * DEFAULTS
     */
    public static readonly DEFAULT_CONFIG_FILE = 'config.json';
    public static readonly DEFAULT_DB_MYSQL_HOST = '10.103.0.2';
    public static readonly DEFAULT_DB_MYSQL_PORT = 3306;

    /**
     * instance
     * @protected
     */
    protected static _instance: Config;

    /**
     *
     * @protected
     */
    protected _schema: ObjectSchema<any> | null = null;

    /**
     * getInstance
     */
    public static getInstance(): Config {
        if (!Config._instance) {
            Config._instance = new Config(SchemaConfigOptions);
        }

        return Config._instance;
    }

    /**
     * constructor
     * @param schema
     * @private
     */
    protected constructor(schema: ObjectSchema<any>) {
        this._schema = schema;
    }

    /**
     * global config
     * @private
     */
    protected _config: T | null = null;

    /**
     * set
     * @param config
     */
    public set(aConfig: T | null): void {
        this._config = aConfig;
    }

    /**
     * get
     */
    public get(): T | null {
        return this._config;
    }

    public async load(
        configFile: string | null = null,
        useEnv: boolean = false
    ): Promise<T | null> {
        let config: T | null = null;

        if (configFile) {
            try {
                const rawdata = readFileSync(configFile, {
                    // @ts-ignore
                    encoding: 'utf-8'
                });

                console.log(`Config::load: Load json-file: ${configFile}`);

                const fileConfig = JSON.parse(rawdata);
                const errors: SchemaErrors = [];

                if (this._schema instanceof ObjectSchema) {
                    if (!this._schema.validate(fileConfig, errors)) {
                        console.log('Config::load: Config file error:');
                        console.log(JSON.stringify(errors, null, 2));

                        return null;
                    }
                } else {
                    console.log('Config::load: Config schema is not set!');
                }

                config = fileConfig;
            } catch (err) {
                console.error(err);
                return null;
            }
        }

        // -------------------------------------------------------------------------------------------------------------

        if (useEnv) {
            config = this._loadEnv(config);
        }

        // -------------------------------------------------------------------------------------------------------------

        config = this._setDefaults(config);

        if (config) {
            this.set(config);
        }

        return config;
    }

    /**
     * _loadEnv
     * @param config
     * @protected
     */
    protected _loadEnv(config: T | null): T | null {
        return config;
    }

    /**
     * _setDefaults
     * @param config
     * @protected
     */
    protected _setDefaults(config: T | null): T | null {
        return config;
    }

}