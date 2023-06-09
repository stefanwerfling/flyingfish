import {
    DashboardInfoResponse,
    PublicIPBlacklistCheckResponse,
    SchemaDashboardInfoResponse,
    SchemaPublicIPBlacklistCheckResponse,
    SchemaStreamRequestsResponse,
    StreamRequestsResponse
} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch';

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