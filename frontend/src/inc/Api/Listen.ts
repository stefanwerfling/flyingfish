import {NetFetch} from '../Net/NetFetch';

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
export type ListenData = {
    id: number;
    type: number;
    port: number;
    protocol: number;
    enable_ipv6: boolean;
    check_address: boolean;
    name: string;
    routeless: boolean;
    description: string;
    fix?: boolean;
    disable: boolean;
};

/**
 * ListenResponse
 */
export type ListenResponse = {
    status: string;
    msg?: string;
    list: ListenData[];
};

/**
 * Listen
 */
export class Listen {

    /**
     * getListens
     */
    public static async getListens(): Promise<ListenResponse| null> {
        const result = await NetFetch.getData('/json/listen/list');

        if (result) {
            if (result.status === 'ok') {
                return result as ListenResponse;
            }
        }

        return null;
    }

    /**
     * saveListen
     * @param listen
     */
    public static async saveListen(listen: ListenData): Promise<boolean> {
        const result = await NetFetch.postData('/json/listen/save', listen);

        if (result) {
            if (result.status === 'ok') {
                return true;
            } else {
                throw new Error(result.error);
            }
        }

        return false;
    }

    /**
     * deleteListen
     * @param listen
     */
    public static async deleteListen(listen: ListenData): Promise<boolean> {
        const result = await NetFetch.postData('/json/listen/delete', listen);

        if (result) {
            if (result.status === 'ok') {
                return true;
            } else {
                throw new Error(result.error);
            }
        }

        return false;
    }
}