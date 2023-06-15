import {BackendConfigOptions, ENV_DUTY_DB, ENV_OPTIONAL_DB, SchemaBackendConfigOptions} from 'flyingfish_schemas';
import path from 'path';
import * as process from 'process';
import {v4 as uuid} from 'uuid';
import {Config as ConfigCore} from 'flyingfish_core';

/**
 * ENV_OPTIONAL
 */
export enum ENV_OPTIONAL {
    HTTPSERVER_PORT = 'FLYINGFISH_HTTPSERVER_PORT',
    HTTPSERVER_PUBLICDIR = 'FLYINGFISH_HTTPSERVER_PUBLICDIR',
    DNSSERVER_PORT = 'FLYINGFISH_DNSSERVER_PORT',
    NGINX_CONFIG = 'FLYINGFISH_NGINX_CONFIG',
    NGINX_PREFIX = 'FLYINGFISH_NGINX_PREFIX',
    NGINX_MODULE_MODE_DYN = 'FLYINGFISH_NGINX_MODULE_MODE_DYN',
    NGINX_SECRET = 'FLYINGFISH_NGINX_SECRET',
    SSHSERVER_IP = 'FLYINGFISH_SSHSERVER_IP',
    DOCKER_INSIDE = 'FLYINGFISH_DOCKER_INSIDE',
    LOGGING_LEVEL = 'FLYINGFISH_LOGGING_LEVEL',
    HIMHIP_USE = 'FLYINGFISH_HIMHIP_USE',
    HIMHIP_SECRET = 'FLYINGFISH_HIMHIP_SECRET',
    FF_LIBPATH = 'FLYINGFISH_LIBPATH'
}

/**
 * Config
 */
export class Config extends ConfigCore<BackendConfigOptions> {

    /**
     * DEFAULTS
     */
    public static readonly DEFAULT_HTTPSERVER_PORT = 3000;
    public static readonly DEFAULT_HTTPSERVER_PUBLICDIR = 'frontend';
    public static readonly DEFAULT_DNSSERVER_PORT = 5333;
    public static readonly DEFAULT_NGINX_CONFIG = path.join('/', 'opt', 'app', 'nginx', 'nginx.conf');
    public static readonly DEFAULT_NGINX_PREFIX = path.join('/', 'opt', 'app', 'nginx');
    public static readonly DEFAULT_SSHSERVER_IP = '10.103.0.4';
    public static readonly DEFAULT_DOCKER_GATEWAY = '10.103.0.1';
    public static readonly DEFAULT_HIMHIP_USE = true;
    public static readonly DEFAULT_HIMHIP_SECRET = '';

    /**
     * getInstance
     */
    public static getInstance(): Config {
        if (!ConfigCore._instance) {
            ConfigCore._instance = new Config(SchemaBackendConfigOptions);
        }

        return ConfigCore._instance as Config;
    }

    /**
     * _loadEnv
     * @param aConfig
     * @protected
     */
    protected _loadEnv(aConfig: BackendConfigOptions | null): BackendConfigOptions | null {
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
                },
                httpserver: {
                    port: Config.DEFAULT_HTTPSERVER_PORT,
                    publicdir: Config.DEFAULT_HTTPSERVER_PUBLICDIR
                },
                nginx: {
                    config: Config.DEFAULT_NGINX_CONFIG,
                    prefix: Config.DEFAULT_NGINX_PREFIX
                },
                himhip: {
                    use: Config.DEFAULT_HIMHIP_USE,
                    secret: Config.DEFAULT_HIMHIP_SECRET
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

        // db influx -----------------------------------------------------------------------------------------------

        const influxEnvList = [
            ENV_OPTIONAL_DB.DB_INFLUX_URL,
            ENV_OPTIONAL_DB.DB_INFLUX_TOKEN,
            ENV_OPTIONAL_DB.DB_INFLUX_ORG,
            ENV_OPTIONAL_DB.DB_INFLUX_BUCKET
        ];

        for (const entry of influxEnvList) {
            if (process.env[entry]) {
                config.db.influx = {
                    url: '',
                    password: '',
                    username: '',
                    org: '',
                    bucket: '',
                    token: ''
                };
                break;
            }
        }

        if (config.db.influx) {
            if (process.env[ENV_OPTIONAL_DB.DB_INFLUX_URL]) {
                config.db.influx.url = process.env[ENV_OPTIONAL_DB.DB_INFLUX_URL];
            }

            if (process.env[ENV_OPTIONAL_DB.DB_INFLUX_TOKEN]) {
                config.db.influx.token = process.env[ENV_OPTIONAL_DB.DB_INFLUX_TOKEN];
            }

            if (process.env[ENV_OPTIONAL_DB.DB_INFLUX_ORG]) {
                config.db.influx.org = process.env[ENV_OPTIONAL_DB.DB_INFLUX_ORG];
            }

            if (process.env[ENV_OPTIONAL_DB.DB_INFLUX_BUCKET]) {
                config.db.influx.bucket = process.env[ENV_OPTIONAL_DB.DB_INFLUX_BUCKET];
            }
        }

        // httpserver ----------------------------------------------------------------------------------------------

        if (process.env[ENV_OPTIONAL.HTTPSERVER_PORT]) {
            config.httpserver.port = parseInt(process.env[ENV_OPTIONAL.HTTPSERVER_PORT]!, 10) ||
                Config.DEFAULT_HTTPSERVER_PORT;
        }

        if (process.env[ENV_OPTIONAL.HTTPSERVER_PUBLICDIR]) {
            config.httpserver.publicdir = process.env[ENV_OPTIONAL.HTTPSERVER_PUBLICDIR];
        }

        // dnsserver -----------------------------------------------------------------------------------------------

        if (process.env[ENV_OPTIONAL.DNSSERVER_PORT]) {
            config.dnsserver = {
                port: parseInt(process.env[ENV_OPTIONAL.DNSSERVER_PORT]!, 10) || Config.DEFAULT_DNSSERVER_PORT
            };
        }

        // nginx ---------------------------------------------------------------------------------------------------

        if (!config.nginx) {
            config.nginx = {
                config: Config.DEFAULT_NGINX_CONFIG,
                prefix: Config.DEFAULT_NGINX_PREFIX
            };
        }

        if (process.env[ENV_OPTIONAL.NGINX_CONFIG]) {
            config.nginx.config = process.env[ENV_OPTIONAL.NGINX_CONFIG];
        }

        if (process.env[ENV_OPTIONAL.NGINX_PREFIX]) {
            config.nginx.prefix = process.env[ENV_OPTIONAL.NGINX_PREFIX];
        }

        if (process.env[ENV_OPTIONAL.NGINX_MODULE_MODE_DYN]) {
            config.nginx.module_mode_dyn = process.env[ENV_OPTIONAL.NGINX_MODULE_MODE_DYN] === '1';
        }

        if (process.env[ENV_OPTIONAL.NGINX_SECRET]) {
            config.nginx.secret = process.env[ENV_OPTIONAL.NGINX_SECRET];
        }

        // sshserver -----------------------------------------------------------------------------------------------

        if (process.env[ENV_OPTIONAL.SSHSERVER_IP]) {
            config.sshserver = {
                ip: process.env[ENV_OPTIONAL.SSHSERVER_IP]
            };
        }

        // docker --------------------------------------------------------------------------------------------------

        if (process.env[ENV_OPTIONAL.DOCKER_INSIDE]) {
            config.docker = {
                inside: process.env[ENV_OPTIONAL.DOCKER_INSIDE] === '1',
                gateway: Config.DEFAULT_DOCKER_GATEWAY
            };
        }

        if (process.env[ENV_OPTIONAL.LOGGING_LEVEL]) {
            config.logging = {
                level: process.env[ENV_OPTIONAL.LOGGING_LEVEL]
            };
        }

        // himhip --------------------------------------------------------------------------------------------------

        if (!config.himhip) {
            config.himhip = {
                use: Config.DEFAULT_HIMHIP_USE,
                secret: Config.DEFAULT_HIMHIP_SECRET
            };
        }

        if (process.env[ENV_OPTIONAL.HIMHIP_USE]) {
            config.himhip.use = process.env[ENV_OPTIONAL.HIMHIP_USE] === '1';
        }

        if (process.env[ENV_OPTIONAL.HIMHIP_SECRET]) {
            config.himhip.secret = process.env[ENV_OPTIONAL.HIMHIP_SECRET];
        }

        // ff ------------------------------------------------------------------------------------------------------

        if (process.env[ENV_OPTIONAL.FF_LIBPATH]) {
            config.flyingfish_libpath = process.env[ENV_OPTIONAL.FF_LIBPATH];
        }

        return config;
    }

    /**
     * _setDefaults
     * @param config
     * @protected
     */
    protected _setDefaults(config: BackendConfigOptions | null): BackendConfigOptions | null {
        if (config === null) {
            return null;
        }

        let ffPath = Config.DEFAULT_FF_DIR;

        if (config.flyingfish_libpath) {
            ffPath = config.flyingfish_libpath;
        } else {
            config.flyingfish_libpath = ffPath;
        }

        if (!config.httpserver.sslpath) {
            config.httpserver.sslpath = path.join(ffPath, 'ssl');
        }

        // default dhparam
        if (config.nginx) {
            config.nginx.dhparamfile = path.join(ffPath, 'nginx', 'dhparam.pem');

            if (!config.nginx.secret) {
                config.nginx.secret = uuid().replaceAll('-', '');
            }
        }

        if (!config.dnsserver) {
            config.dnsserver = {
                port: Config.DEFAULT_DNSSERVER_PORT
            };
        }

        if (!config.sshserver) {
            config.sshserver = {
                ip: Config.DEFAULT_SSHSERVER_IP
            };
        }

        // upnpnat enable
        if (!config.upnpnat) {
            config.upnpnat = {
                enable: true
            };
        }

        // dyndnsclient enable
        if (!config.dyndnsclient) {
            config.dyndnsclient = {
                enable: true
            };
        }

        // himpip provider
        if (!config.himpip) {
            config.himpip = {
                provider: 'ipify'
            };
        }

        return config;
    }

}