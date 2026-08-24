import * as dotenv from 'dotenv';
import {Logger} from 'flyingfish_core';
import {FlyingFishConfig} from './src/Application/Config/FlyingFishConfig';
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

    // Establish the flyingfish_core Config singleton as the delegating backend
    // Config (whose `get()` bridges to FlyingFishConfig). core's Logger reads
    // its config through this singleton, so it must exist before load().
    Config.getInstance();

    // Since the figtree migration, the configuration is loaded into
    // FlyingFishConfig (figtree's Config singleton); the backend Config.get()
    // delegates there. Load and configure it directly so core's Logger sees a
    // writable log dir instead of falling back to /var/log/flyingfish/.
    await FlyingFishConfig.getInstance().load(null, true);
    const config = FlyingFishConfig.getInstance().get();

    if (config === null) {
        console.log('Configloader is return empty config, please check your .env file');
        return;
    }

    if (typeof config.logging === 'undefined') {
        config.logging = {};
    }

    config.logging.dirname = '/tmp/';

    FlyingFishConfig.getInstance().set(config);

    Logger.getLogger();
});