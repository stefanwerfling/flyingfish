import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * SchemaFlyingFishJsonLog
 */
export const SchemaFlyingFishJsonLog = Vts.object({
    source: Vts.string(),
    source_type: Vts.string(),
    logging: Vts.string()
});

/**
 * SchemaJsonLogAccessHttp
 * https://www.npmjs.com/package/nginx-access-log
 * https://vahid4m.medium.com/monitoring-response-times-using-nginx-telegraf-and-influxdb-c96c1be8fa75
 */
export const SchemaJsonLogAccessHttp = SchemaFlyingFishJsonLog.extend({
    ff_http_id: Vts.number(),
    time: Vts.string(),
    host: Vts.string(),
    forwardedfor: Vts.string(),
    req: Vts.string(),
    method: Vts.string(),
    uri: Vts.string(),
    status: Vts.string(),
    size: Vts.string(),
    referer: Vts.string(),
    ua: Vts.string(),
    reqtime: Vts.string(),
    runtime: Vts.string(),
    apptime: Vts.string(),
    cache: Vts.string(),
    vhost: Vts.string()
});

export type JsonLogAccessHttp = ExtractSchemaResultType<typeof SchemaJsonLogAccessHttp>;

export const SchemaJsonLogAccessStream = SchemaFlyingFishJsonLog.extend({
    ff_stream_id: Vts.number(),
    time: Vts.string(),
    host: Vts.string(),
    protocol: Vts.string(),
    status: Vts.string(),
    bytes_sent: Vts.string(),
    bytes_received: Vts.string(),
    session_time: Vts.string(),
    upstream_addr: Vts.string(),
    upstream_bytes_sent: Vts.string(),
    upstream_bytes_received: Vts.string(),
    upstream_connect_time: Vts.string()
});

export type JsonLogAccessStream = ExtractSchemaResultType<typeof SchemaJsonLogAccessStream>;

/**
 * NginxLogFormatJson
 */
export class NginxLogFormatJson {

    /**
     * generateAccessStream
     * @param streamId
     */
    public static generateAccessStream(streamId: number): string {
        return JSON.stringify({
            source: 'nginx',
            source_type: 'stream',
            ff_stream_id: streamId,
            time: '$time_iso8601',
            host: '$remote_addr',
            protocol: '$protocol',
            status: '$status',
            bytes_sent: '$bytes_sent',
            bytes_received: '$bytes_received',
            session_time: '$session_time',
            upstream_addr: '$upstream_addr',
            upstream_bytes_sent: '$upstream_bytes_sent',
            upstream_bytes_received: '$upstream_bytes_received',
            upstream_connect_time: '$upstream_connect_time'
        } as JsonLogAccessStream);
    }

    /**
     * generateAccessHtml
     * @param httpId
     */
    public static generateAccessHtml(httpId: number): string {
        return JSON.stringify({
            source: 'nginx',
            source_type: 'http',
            ff_http_id: httpId,
            time: '$time_iso8601',
            host: '$remote_addr',
            forwardedfor: '$http_x_forwarded_for',
            req: '$request',
            method: '$request_method',
            uri: '$request_uri',
            status: '$status',
            size: '$body_bytes_sent',
            referer: '$http_referer',
            ua: '$http_user_agent',
            reqtime: '$request_time',
            runtime: '$upstream_http_x_runtime',
            apptime: '$upstream_response_time',
            cache: '$upstream_http_x_cache',
            vhost: '$host'
        } as JsonLogAccessHttp);
    }

}