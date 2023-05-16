import {HttpError, InfluxDB, ParameterizedQuery, Point, QueryApi, WriteApi} from '@influxdata/influxdb-client';
import {Logger} from 'flyingfish_core';
import {hostname} from 'node:os';

/**
 * InfluxDbHelperOptions
 */
export type InfluxDbHelperOptions = {
    url: string;
    token: string;
    org: string;
    bucket: string;
};

/**
 * InfluxDbHelper
 */
export class InfluxDbHelper {

    /**
     * options
     * @private
     */
    private static _options: InfluxDbHelperOptions;

    /**
     * connection
     * @private
     */
    private static _connection: InfluxDB;

    /**
     * init
     * @param options
     */
    public static async init(options: InfluxDbHelperOptions): Promise<void> {
        this._options = options;

        const url = this._options.url;
        const token = this._options.token;

        this._connection = new InfluxDB({
            url: url,
            token: token
        });
    }

    /**
     * isConnected
     */
    public static isConnected(): boolean {
        return Boolean(this._connection);
    }

    /**
     * getConnection
     */
    public static getConnection(): InfluxDB {
        return this._connection;
    }

    /**
     * getBucket
     */
    public static getBucket(): string {
        return InfluxDbHelper._options.bucket;
    }

    /**
     * _getWriter
     * @protected
     */
    protected static _getWriter(): WriteApi {
        const writeApi = InfluxDbHelper.getConnection().getWriteApi(
            InfluxDbHelper._options.org,
            InfluxDbHelper._options.bucket,
            'ms'
        );

        writeApi.useDefaultTags({location: hostname()});

        return writeApi;
    }

    /**
     * _getQuery
     * @protected
     */
    protected static _getQuery(): QueryApi {
        return InfluxDbHelper.getConnection().getQueryApi(
            InfluxDbHelper._options.org
        );
    }

    /**
     * addPoint
     * @param apoint
     */
    public static addPoint(apoint: Point): void {
        const writeApi = InfluxDbHelper._getWriter();

        writeApi.writePoint(apoint);

        writeApi
        .close()
        .catch((e) => {
            Logger.getLogger().error('InfluxDbHelper::addPoint: Error: ');
            Logger.getLogger().error(e);

            if (e instanceof HttpError && e.statusCode === 401) {
                Logger.getLogger().error('InfluxDbHelper::addPoint: setup a new InfluxDB database');
            }
        });
    }

    /**
     * readPoints
     * @param query
     */
    public static async readPoints(query: ParameterizedQuery): Promise<{ [p: string]: any; }[]> {
        const queryApi = InfluxDbHelper._getQuery();
        return queryApi.collectRows(query);
    }

}