import {DefaultReturn} from 'flyingfish_schemas';
import {Schema} from 'vts';
import {UnknownResponse} from '../Api/Error/UnknownResponse';
import {Response} from '../Api/Response/Response';

/**
 * NetFetch
 */
export class NetFetch {

    /**
     * postData
     * @param url
     * @param data
     * @param schema
     */
    public static async postData<T>(url: string, data: object, schema: Schema<T>): Promise<T & DefaultReturn> {
        // Default options are marked with *
        const response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify(data)
        });

        let rdata: any;

        try {
            rdata = await response.json();
        } catch (e) {
            throw new UnknownResponse('Json prase error!');
        }

        Response.isResponse(schema, rdata);

        return rdata;
    }

    /**
     * getData
     * @param url
     * @param schema
     */
    public static async getData<T>(url: string, schema: Schema<T>): Promise<T & DefaultReturn> {
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer'
        });

        let data: any;

        try {
            data = await response.json();
        } catch (e) {
            throw new UnknownResponse('Json prase error!');
        }

        Response.isResponse(schema, data);

        return data;
    }

}