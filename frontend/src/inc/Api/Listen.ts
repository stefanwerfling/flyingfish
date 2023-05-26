import {ExtractSchemaResultType, Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch';
import {SchemaDefaultReturn} from './Types/DefaultReturn';

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
 * ListenData
 */
export const SchemaListenData = Vts.object({
    id: Vts.number(),
    type: Vts.number(),
    port: Vts.number(),
    protocol: Vts.number(),
    enable_ipv6: Vts.boolean(),
    check_address: Vts.boolean(),
    check_address_type: Vts.number(),
    name: Vts.string(),
    routeless: Vts.boolean(),
    description: Vts.string(),
    fix: Vts.optional(Vts.boolean()),
    disable: Vts.boolean(),
    listen_category: Vts.optional(Vts.number()),
    proxy_protocol: Vts.boolean(),
    proxy_protocol_in: Vts.boolean()
});

export type ListenData = ExtractSchemaResultType<typeof SchemaListenData>;

/**
 * ListenResponse
 */
export const SchemaListenResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaListenData)
});

export type ListenResponse = ExtractSchemaResultType<typeof SchemaListenResponse>;

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
    public static async deleteListen(listen: ListenData): Promise<boolean> {
        await NetFetch.postData('/json/listen/delete', listen, SchemaDefaultReturn);
        return true;
    }

}