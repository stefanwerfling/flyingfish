import {Logger} from '@stefanwerfling/figtree';
import {SysLogServer} from '../SysLogServer/SysLogServer.js';
import {NginxAccessLogSink} from '../Log/NginxAccessLogSink.js';

/**
 * Owns the nginx access-log syslog server. nginx's `access_log` points at this server (the
 * config builder reads its address). Received lines are forwarded to the central Log-Center
 * via {@link NginxAccessLogSink} — rate-limited + bounded, so heavy traffic can never flood
 * the system (and UDP delivery means nginx itself never blocks).
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
            // Non-blocking hand-off: the sink rate-limits + bounds persistence (drop-on-overflow).
            NginxAccessLogSink.getInstance().offer(msg.toString());
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
