import {SchemaDefaultReturn} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch.js';

/**
 * Nginx
 */
export class Nginx {

    /**
     * reload
     */
    public static async reload(): Promise<boolean> {
        await NetFetch.getData('/json/nginx/reload', SchemaDefaultReturn);
        return true;
    }

}