import {Point} from '@influxdata/influxdb-client';
import moment from 'moment/moment.js';
import {JsonLogAccessHttp} from '../../../Nginx/NginxLogFormatJson.js';
import {InfluxDbHelper} from '../InfluxDbHelper.js';

/**
 * NginxHttpAccess
 */
export class NginxHttpAccess {

    /**
     * name
     * @protected
     */
    protected static _mName = 'nginx_http_access';

    /**
     * addLog
     * @param log
     */
    public static addLog(log: JsonLogAccessHttp): void {
        const nPoint = new Point(NginxHttpAccess._mName);
        const time = moment(log.time);

        nPoint.tag('source_type', log.source_type);
        nPoint.tag('ff_http_id', `${log.ff_http_id}`);
        nPoint.timestamp(time.toDate());
        nPoint.tag('host', log.host);
        nPoint.tag('proxy_protocol_addr', log.proxy_protocol_addr);
        nPoint.tag('forwardedfor', log.forwardedfor);
        nPoint.tag('req', log.req);
        nPoint.tag('method', log.method);
        nPoint.tag('scheme', log.scheme);
        nPoint.tag('uri', log.uri);
        nPoint.tag('status', log.status);
        nPoint.uintField('size', parseInt(log.size, 10) ?? 0);
        nPoint.tag('referer', log.referer);
        nPoint.tag('ua', log.ua);
        nPoint.tag('reqtime', log.reqtime);
        nPoint.tag('runtime', log.runtime);
        nPoint.tag('apptime', log.apptime);
        nPoint.tag('cache', log.cache);
        nPoint.tag('vhost', log.vhost);

        InfluxDbHelper.addPoint(nPoint);
    }

}