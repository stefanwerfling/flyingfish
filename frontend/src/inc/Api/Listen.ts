import {ListenData, ListenDelete, ListenResponse, SchemaDefaultReturn, SchemaListenResponse} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch';

/**
 * ListenAddressCheckType
 */
export enum ListenAddressCheckType {
    black,
    white
}

/**
 * ListenTypes
 */
export enum ListenTypes {
    stream,
    http
}

/**
 * ListenCategory
 */
export enum ListenCategory {
    default_stream_nonessl,
    default_stream_ssl,
    default_http,
    default_https,
    stream,
    http,
    https
}

/**
 * Listen
 */
export class Listen {

    /**
     * getListens
     */
    public static async getListens(): Promise<ListenResponse> {
        return NetFetch.getData('/json/listen/list', SchemaListenResponse);
    }

    /**
     * saveListen
     * @param listen
     */
    public static async saveListen(listen: ListenData): Promise<boolean> {
        await NetFetch.postData('/json/listen/save', listen, SchemaDefaultReturn);
        return true;
    }

    /**
     * deleteListen
     * @param listen
     */
    public static async deleteListen(listen: ListenDelete): Promise<boolean> {
        await NetFetch.postData('/json/listen/delete', listen, SchemaDefaultReturn);
        return true;
    }

}