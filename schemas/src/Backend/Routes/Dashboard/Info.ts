import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';
import {SchemaHimHIPData} from '../../HimHIP/HimHIP.js';

/**
 * DashboardInfoIpBlock
 */
export const SchemaDashboardInfoIpBlock = Vts.object({
    id: Vts.number(),
    ip: Vts.string(),
    info: Vts.string(),
    last_block: Vts.number(),
    latitude: Vts.string(),
    longitude: Vts.string()
});

/**
 * DashboardInfoIpBlock
 */
export type DashboardInfoIpBlock = ExtractSchemaResultType<typeof SchemaDashboardInfoIpBlock>;

/**
 * DashboardInfoResponse
 */
export const SchemaDashboardInfoResponse = SchemaDefaultReturn.extend({
    public_ip: Vts.or([Vts.string(), Vts.null()]),
    public_ip_blacklisted: Vts.boolean(),
    host: Vts.or([SchemaHimHIPData, Vts.null()]),
    ipblocks: Vts.array(SchemaDashboardInfoIpBlock),
    ipblock_count: Vts.number()
});

/**
 * DashboardInfoResponse
 */
export type DashboardInfoResponse = ExtractSchemaResultType<typeof SchemaDashboardInfoResponse>;