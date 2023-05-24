import {Point} from '@influxdata/influxdb-client';
import {Logger} from 'flyingfish_core';
import {JsonLogAccessStream} from '../../../Nginx/NginxLogFormatJson.js';
import {InfluxDbHelper} from '../InfluxDbHelper.js';
import moment from 'moment';

/**
 * NginxStreamAccess
 */
export class NginxStreamAccess {

    /**
     * name
     * @protected
     */
    protected static _mName = 'nginx_stream_access';

    /**
     * addLog
     * @param log
     */
    public static addLog(log: JsonLogAccessStream): void {
        const nPoint = new Point(NginxStreamAccess._mName);
        const time = moment(log.time);

        let byteSent = 0;

        if (log.upstream_bytes_sent !== '') {
            try {
                byteSent = parseInt(log.upstream_bytes_sent, 10) ?? 0;
            } catch (error) {
                if (error instanceof Error) {
                    Logger.getLogger().error(
                        `NginxStreamAccess::addLog: parse int from upstream_bytes_sent: "${error.message}" by value: "${log.upstream_bytes_sent}"`
                    );
                } else {
                    throw error;
                }
            }
        }

        nPoint.tag('source_type', log.source_type);
        nPoint.tag('ff_stream_id', `${log.ff_stream_id}`);
        nPoint.timestamp(time.toDate());
        nPoint.tag('msec', log.msec);
        nPoint.tag('host', log.host);
        nPoint.tag('protocol', log.protocol);
        nPoint.tag('status', log.status);
        nPoint.uintField('bytes_sent', byteSent);
        nPoint.tag('bytes_received', log.upstream_bytes_received);
        nPoint.tag('session_time', log.session_time);

        if (log.upstream_addr !== '') {
            nPoint.tag('upstream_addr', log.upstream_addr);
        }

        nPoint.tag('upstream_bytes_sent', log.upstream_bytes_sent === '' ? '0' : log.upstream_bytes_sent);
        nPoint.tag('upstream_bytes_received', log.upstream_bytes_received === '' ? '0' : log.upstream_bytes_received);
        nPoint.tag('upstream_connect_time', log.upstream_connect_time);

        InfluxDbHelper.addPoint(nPoint);
    }

}