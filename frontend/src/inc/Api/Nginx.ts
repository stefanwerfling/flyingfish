import {NetFetch} from '../Net/NetFetch';
import {SchemaDefaultReturn} from './Types/DefaultReturn';

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