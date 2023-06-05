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
    id: Vts.number(),
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

export type PublicIPBlacklistCheckResponse = ExtractSchemaResultType<typeof SchemaPublicIPBlacklistCheckResponse>;

/**
 * SchemaStreamRequestPoint
 */
export const SchemaStreamRequestPoint = Vts.object({
    counts: Vts.number(),
    time: Vts.string()
});

export type StreamRequestPoint = ExtractSchemaResultType<typeof SchemaStreamRequestPoint>;

export const SchemaStreamRequestsResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaStreamRequestPoint)
});

export type StreamRequestsResponse = ExtractSchemaResultType<typeof SchemaStreamRequestsResponse>;

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

    /**
     * publicIpBlacklistCheck
     */
    public static async publicIpBlacklistCheck(): Promise<PublicIPBlacklistCheckResponse> {
        return NetFetch.getData('/json/dashboard/publicipblacklistcheck', SchemaPublicIPBlacklistCheckResponse);
    }

    /**
     * streamRequestList
     */
    public static async streamRequestList(): Promise<StreamRequestsResponse> {
        return NetFetch.getData('/json/dashboard/streamrequests', SchemaStreamRequestsResponse);
    }

}