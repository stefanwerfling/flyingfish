import {ExtractSchemaResultType, Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch';
import {SchemaDefaultReturn} from './Types/DefaultReturn';

/**
 * HimHIPData
 */
export const SchemaHimHIPData = Vts.object({
    gatewaymac: Vts.string(),
    network: Vts.string(),
    gateway: Vts.string(),
    interface: Vts.string(),
    hostip: Vts.string()
});

export type HimHIPData = ExtractSchemaResultType<typeof SchemaHimHIPData>;

/**
 * DashboardInfoIpBlock
 */
export const SchemaDashboardInfoIpBlock = Vts.object({
    ip: Vts.string(),
    info: Vts.string(),
    last_block: Vts.number(),
    latitude: Vts.string(),
    longitude: Vts.string()
});

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

export type DashboardInfoResponse = ExtractSchemaResultType<typeof SchemaDashboardInfoResponse>;

/**
 * Dashboard
 */
export class Dashboard {

    /**
     * getInfo
     */
    public static async getInfo(): Promise<DashboardInfoResponse> {
        return NetFetch.getData('/json/dashboard/info', SchemaDashboardInfoResponse);
    }

}