import {FileHelper, Logger} from 'flyingfish_core';
import fs from 'fs/promises';
import path from 'path';
import {SchemaErrors} from 'vts';
import {Config} from '../inc/Config/Config.js';
import {NginxHttpAccess as NginxHttpAccessInfluxDB} from '../inc/Db/InfluxDb/Entity/NginxHttpAccess.js';
import {NginxStreamAccess as NginxStreamAccessInfluxDB} from '../inc/Db/InfluxDb/Entity/NginxStreamAccess.js';
import {NginxConfigBuilder} from '../inc/Nginx/NginxConfigBuilder.js';
import {SchemaJsonLogAccessHttp, SchemaJsonLogAccessStream} from '../inc/Nginx/NginxLogFormatJson.js';
import {NginxServer} from '../inc/Nginx/NginxServer.js';
import {OpenSSL} from '../inc/OpenSSL/OpenSSL.js';
import {NginxControlHttpServer} from '../inc/Server/NginxControlHttpServer.js';
import {SysLogServer} from '../inc/SysLogServer/SysLogServer.js';

/**
 * The service for nginx config generation.
 */
export class NginxService {

    /**
     * Ngnix service instance.
     * @member {NginxService|null} Instance of service.
     */
    private static _instance: NginxService | null = null;

    /**
     * Return an instance of nginx service.
     * @returns {NginxService}
     */
    public static getInstance(): NginxService {
        if (NginxService._instance === null) {
            NginxService._instance = new NginxService();
        }

        return NginxService._instance;
    }

    /**
     * Nginx private syslog server for logs controll.
     * @member {SysLogServer|null}
     */
    private _syslog: SysLogServer | null = null;

    /**
     * Nginx privat control server for ip checks
     * @private
     */
    private _control: NginxControlHttpServer | null = null;

    /**
     * The nginx config builder (extracted from this service in the phase-2 split).
     * @private
     */
    private _configBuilder: NginxConfigBuilder = new NginxConfigBuilder();

    /**
     * Delegates to the config builder to populate the shared NginxConfig from the
     * database. The syslog/control servers stay owned by this service and are
     * passed in so the builder can reference their addresses.
     * @protected
     */
    private async _loadConfig(): Promise<void> {
        await this._configBuilder.build(this._syslog, this._control);
    }

    /**
     * _startSysLog
     * @protected
     */
    protected _startSysLog(): void {
        this._syslog = new SysLogServer();
        this._syslog.setOnListen((sysLogServer) => {
            Logger.getLogger().info(
                'Liste started on: %s:%d',
                sysLogServer.getOptions().address,
                sysLogServer.getOptions().port,
                {
                    class: 'NginxService::_startSysLog::SysLogServer::setOnListen'
                }
            );
        });

        this._syslog.setOnError((
            _sysLogServer,
            err
        ) => {
            Logger.getLogger().error('Syslog error', {
                error: err,
                class: 'NginxService::_startSysLog::SysLogServer::setOnError'
            });
        });

        this._syslog.setOnMessage((
            _sysLogServer,
            msg
        ) => {
            Logger.getLogger().silly(
                '%s',
                msg.toString(), 
                {
                    class: 'NginxService::_startSysLog::SysLogServer::setOnMessage'
                }
            );

            const parts = msg.toString().split(`${NginxConfigBuilder.SYSLOG_TAG}: `);

            try {
                const nginxLog = JSON.parse(parts[1]);

                if (nginxLog.source_type) {
                    const errors: SchemaErrors = [];

                    if (nginxLog.source_type === 'stream') {
                        if (SchemaJsonLogAccessStream.validate(nginxLog, errors)) {
                            NginxStreamAccessInfluxDB.addLog(nginxLog);
                        } else {
                            Logger.getLogger().error('Validation error SchemaJsonLogAccessStream:', {
                                class: 'NginxService::_startSysLog::SysLogServer::setOnMessage:stream',
                                errors: JSON.stringify(errors, null, 2)
                            });
                        }
                    } else if (nginxLog.source_type === 'http') {
                        if (SchemaJsonLogAccessHttp.validate(nginxLog, errors)) {
                            NginxHttpAccessInfluxDB.addLog(nginxLog);
                        } else {
                            Logger.getLogger().error('Validation error SchemaJsonLogAccessHttp:', {
                                class: 'NginxService::_startSysLog::SysLogServer::setOnMessage',
                                errors: JSON.stringify(errors, null, 2)
                            });
                        }
                    }
                }
            } catch (error) {
                Logger.getLogger().error('Exception:', {
                    class: 'NginxService::_startSysLog::SysLogServer::setOnMessage'
                });

                if (error instanceof Error) {
                    Logger.getLogger().error(error.message, {
                        class: 'NginxService::_startSysLog::SysLogServer::setOnMessage'
                    });
                } else {
                    console.log(error);
                }

                Logger.getLogger().error(JSON.stringify(error, null, 2), {
                    class: 'NginxService::_startSysLog::SysLogServer::setOnMessage'
                });
            }
        });

        this._syslog.listen();
    }

    protected async _closeSysLog(): Promise<void> {
        if (this._syslog !== null) {
            this._syslog.close();
            this._syslog = null;
        }
    }

    /**
     * Start the nginx control server
     * @protected
     */
    protected async _startControl(): Promise<void> {
        this._control = new NginxControlHttpServer();
        await this._control.listen();
    }

    /**
     * Close the nginx control server
     * @protected
     */
    protected async _closeControl(): Promise<void> {
        if (this._control) {
            this._control.close();
            this._control = null;
        }
    }

    /**
     * start
     */
    public async start(): Promise<void> {
        const dhparam = Config.getInstance().get()?.nginx?.dhparamfile;

        if (dhparam) {
            if (await FileHelper.fileExist(dhparam)) {
                Logger.getLogger().info('Dhparam found.', {
                    class: 'NginxService::start'
                });
            } else {
                Logger.getLogger().info('Create Dhparam ...', {
                    class: 'NginxService::start'
                });

                await fs.mkdir(path.dirname(dhparam), {recursive: true});

                if (await OpenSSL.createDhparam(dhparam, 4096) === null) {
                    Logger.getLogger().warn('Can not create Dhparam!', {
                        class: 'NginxService::start'
                    });
                } else {
                    Logger.getLogger().info('Dhparam finish.', {
                        class: 'NginxService::start'
                    });
                }
            }
        }

        this._startSysLog();
        await this._startControl();
        await this._loadConfig();
        NginxServer.getInstance().start();

        if (NginxServer.getInstance().isRun()) {
            Logger.getLogger().info('Nginx server is start', {
                class: 'NginxService::start'
            });
        }
    }

    /**
     * stop
     * @param forced
     */
    public async stop(forced: boolean = false): Promise<void> {
        Logger.getLogger().info(`Nginx stop with forced: ${forced}`, {
            class: 'NginxService::stop'
        });

        if (NginxServer.getInstance().isRun()) {
            NginxServer.getInstance().stop();
        } else if (forced) {
            NginxServer.getInstance().stop();
        }

        await this._closeControl();
        await this._closeSysLog();
    }

    /**
     * reload
     */
    public async reload(): Promise<void> {
        await this._loadConfig();

        if (await NginxServer.getInstance().testConfig()) {
            Logger.getLogger().error('Nginx server config has a error!', {
                class: 'NginxService::reload'
            });
        }

        NginxServer.getInstance().reload();

        if (NginxServer.getInstance().isRun()) {
            Logger.getLogger().info('Nginx server is reload', {
                class: 'NginxService::reload'
            });
        }
    }

    /**
     * Build the current nginx config as a string from the database, without
     * writing any file or touching the nginx process. Used by the characterization
     * tests around the config generation (phase-2 split).
     */
    public async generateConfig(): Promise<string> {
        await this._loadConfig();

        return NginxServer.getInstance().getConf()?.generate() ?? '';
    }

}