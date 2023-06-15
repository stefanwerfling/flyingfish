import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * ENV_DUTY_DB
 */
export enum ENV_DUTY_DB {
    DB_MYSQL_USERNAME = 'FLYINGFISH_DB_MYSQL_USERNAME',
    DB_MYSQL_PASSWORD = 'FLYINGFISH_DB_MYSQL_PASSWORD',
    DB_MYSQL_DATABASE = 'FLYINGFISH_DB_MYSQL_DATABASE'
}

/**
 * ENV_OPTIONAL_DB
 */
export enum ENV_OPTIONAL_DB {
    DB_MYSQL_HOST = 'FLYINGFISH_DB_MYSQL_HOST',
    DB_MYSQL_PORT = 'FLYINGFISH_DB_MYSQL_PORT',
    DB_INFLUX_URL = 'FLYINGFISH_DB_INFLUX_URL',
    DB_INFLUX_TOKEN = 'FLYINGFISH_DB_INFLUX_TOKEN',
    DB_INFLUX_ORG = 'FLYINGFISH_DB_INFLUX_ORG',
    DB_INFLUX_BUCKET = 'FLYINGFISH_DB_INFLUX_BUCKET'
}

/**
 * SchemaConfigDbOptions
 */
export const SchemaConfigDbOptions = Vts.object({
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
});

/**
 * ConfigDbOptions
 */
export type ConfigDbOptions = ExtractSchemaResultType<typeof SchemaConfigDbOptions>;