import {PkiCaTreeResponse, SchemaPkiCaTreeResponse} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch.js';

/**
 * PKI API client.
 */
export class Pki {

    /**
     * Return the PKI CA tree (public fields only).
     */
    public static async getTree(): Promise<PkiCaTreeResponse> {
        return NetFetch.getData('/json/pki/tree', SchemaPkiCaTreeResponse);
    }

}