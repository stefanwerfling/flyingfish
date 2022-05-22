import {NetFetch} from '../Net/NetFetch';

/**
 * Nginx
 */
export class Nginx {

    /**
     * reload
     */
    public static async reload(): Promise<boolean> {
        return await NetFetch.getData('/json/nginx/reload') as boolean;
    }

}