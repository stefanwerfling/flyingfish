import {Logger} from '@stefanwerfling/figtree';
import {SysLogServer} from '../SysLogServer/SysLogServer.js';

/**
 * Owns the nginx access-log syslog server. nginx's `access_log` points at this server (the
 * config builder reads its address); received log lines are currently just traced. The
 * InfluxDB time-series sink was removed — re-add a consumer here if access-log analytics
 * come back.
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
     * Start the syslog server that receives nginx access logs.
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
