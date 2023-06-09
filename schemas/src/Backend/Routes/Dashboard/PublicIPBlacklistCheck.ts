import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaIpBlacklistCheck
 */
export const SchemaIpBlacklistCheck = Vts.object({
    rbl: Vts.string(),
    listed: Vts.boolean()
});

/**
 * SchemaPublicIPBlacklistCheckResponse
 */
export const SchemaPublicIPBlacklistCheckResponse = SchemaDefaultReturn.extend({
    rbl: Vts.array(SchemaIpBlacklistCheck)
});

/**
 * PublicIPBlacklistCheckResponse
 */
export type PublicIPBlacklistCheckResponse = ExtractSchemaResultType<typeof SchemaPublicIPBlacklistCheckResponse>;