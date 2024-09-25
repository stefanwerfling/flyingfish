import * as dotenv from 'dotenv';
import {Logger} from 'flyingfish_core';
import {Config} from './src/inc/Config/Config';

beforeAll(async() => {
    dotenv.config({path: './../.env'});

    console.log('Loaded Env.');

    // -----------------------------------------------------------------------------------------------------------------

    const envConvert: Map<string, string[]> = new Map([
        ['MARIADB_ROOT_USERNAME', ['FLYINGFISH_DB_MYSQL_USERNAME']],
        ['MARIADB_ROOT_PASSWORD', ['FLYINGFISH_DB_MYSQL_PASSWORD', 'MYSQL_ROOT_PASSWORD']],
        ['MARIADB_DATABASE', ['FLYINGFISH_DB_MYSQL_DATABASE', 'MARIADB_DATABASE']],
        ['LOGGING_LEVEL', ['FLYINGFISH_LOGGING_LEVEL']],
        ['HTTPSERVER_PORT', ['FLYINGFISH_HTTPSERVER_PORT']],
        ['HIMHIP_SECRET', ['FLYINGFISH_SECRET', 'FLYINGFISH_HIMHIP_SECRET']],
        ['REDIS_REQUIREPASS', ['FLYINGFISH_DB_REDIS_PASSWORD']],
        ['INFLUXDB_URL', ['FLYINGFISH_DB_INFLUX_URL']],
        ['INFLUXDB_ADMIN_TOKEN', ['FLYINGFISH_DB_INFLUX_TOKEN']],
        ['INFLUXDB_ORG', ['FLYINGFISH_DB_INFLUX_ORG']],
        ['INFLUXDB_BUCKET', ['FLYINGFISH_DB_INFLUX_BUCKET']],
        ['HIMHIP_USE', ['FLYINGFISH_HIMHIP_USE']],
        ['DYNDNSSERVER_ENABLE', ['FLYINGFISH_DYNDNSSERVER_ENABLE']],
    ]);

    const envs = process.env;

    for (const envKey in envs) {
        if (envConvert.has(envKey)) {
            const envConv = envConvert.get(envKey);

            if (envConv) {
                for (const newEnvKey of envConv) {
                    process.env[newEnvKey] = envs[envKey];
                }
            }
        }
    }

    // -----------------------------------------------------------------------------------------------------------------

    await Config.getInstance().load(null, true);
    const config = Config.getInstance().get();

    if (config === null) {
        console.log('Configloader is return empty config, please check your .env file');
        return;
    }

    if (config) {
        if (typeof config.logging === 'undefined') {
            config.logging = {};
        }

        config.logging.dirname = '/tmp/';

        Config.getInstance().set(config);

        Logger.getLogger();
    }
});