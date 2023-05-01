import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaLoggerConfig} from '../Logger/Logger.js';

/**
 * Config options schema
 */
export const SchemaConfigOptions = Vts.object({
    logging: Vts.optional(SchemaLoggerConfig)
});

/**
 * Config options type
 */
export type ConfigOptions = ExtractSchemaResultType<typeof SchemaConfigOptions>;

/**
 * Config
 */
export class Config<E> {

    /**
     * instance
     * @protected
     */
    protected static _instance: Config<any>;

    /**
     * getInstance
     */
    public static getInstance(): Config<ConfigOptions> {
        if (!Config._instance) {
            Config._instance = new Config<ConfigOptions>();
        }

        return Config._instance;
    }

    /**
     * global config
     * @private
     */
    protected _config: E | null = null;

    /**
     * set
     * @param config
     */
    public set(config: E | null): void {
        this._config = config;
    }

    /**
     * get
     */
    public get(): E | null {
        return this._config;
    }

}