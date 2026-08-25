import {Logger} from 'figtree';
import {SchemaErrors} from 'vts';
import {NginxHttpAccess as NginxHttpAccessInfluxDB} from '../Db/InfluxDb/Entity/NginxHttpAccess.js';
import {NginxStreamAccess as NginxStreamAccessInfluxDB} from '../Db/InfluxDb/Entity/NginxStreamAccess.js';
import {SysLogServer} from '../SysLogServer/SysLogServer.js';
import {NginxConfigBuilder} from './NginxConfigBuilder.js';
import {SchemaJsonLogAccessHttp, SchemaJsonLogAccessStream} from './NginxLogFormatJson.js';

/**
 * Owns the nginx access-log pipeline: a syslog server that receives nginx JSON
 * access logs and writes them to InfluxDB. Extracted from NginxService (phase-2
 * split).
 */
export class NginxAccessLog {

    private _syslog: SysLogServer | null = null;

    /**
     * The syslog server (or null when not started). The config builder reads its
     * address so nginx's access_log points at it.
     */
    public getServer(): SysLogServer | null {
        return this._syslog;
    }

    /**
     * Start the syslog server and wire the nginx-log -> InfluxDB pipeline.
     */
    public start(): void {
        this._syslog = new SysLogServer();
        this._syslog.setOnListen((sysLogServer) => {
            Logger.getLogger().info(
                'Liste started on: %s:%d',
                sysLogServer.getOptions().address,
                sysLogServer.getOptions().port,
                {
                    class: 'NginxAccessLog::start::SysLogServer::setOnListen'
                }
            );
        });

        this._syslog.setOnError((
            _sysLogServer,
            err
        ) => {
            Logger.getLogger().error('Syslog error', {
                error: err,
                class: 'NginxAccessLog::start::SysLogServer::setOnError'
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
                    class: 'NginxAccessLog::start::SysLogServer::setOnMessage'
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
                                class: 'NginxAccessLog::start::SysLogServer::setOnMessage:stream',
                                errors: JSON.stringify(errors, null, 2)
                            });
                        }
                    } else if (nginxLog.source_type === 'http') {
                        if (SchemaJsonLogAccessHttp.validate(nginxLog, errors)) {
                            NginxHttpAccessInfluxDB.addLog(nginxLog);
                        } else {
                            Logger.getLogger().error('Validation error SchemaJsonLogAccessHttp:', {
                                class: 'NginxAccessLog::start::SysLogServer::setOnMessage',
                                errors: JSON.stringify(errors, null, 2)
                            });
                        }
                    }
                }
            } catch (error) {
                Logger.getLogger().error('Exception:', {
                    class: 'NginxAccessLog::start::SysLogServer::setOnMessage'
                });

                if (error instanceof Error) {
                    Logger.getLogger().error(error.message, {
                        class: 'NginxAccessLog::start::SysLogServer::setOnMessage'
                    });
                } else {
                    console.log(error);
                }

                Logger.getLogger().error(JSON.stringify(error, null, 2), {
                    class: 'NginxAccessLog::start::SysLogServer::setOnMessage'
                });
            }
        });

        this._syslog.listen();
    }

    /**
     * Close the syslog server.
     */
    public async close(): Promise<void> {
        if (this._syslog !== null) {
            this._syslog.close();
            this._syslog = null;
        }
    }

}