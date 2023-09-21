import {IpBlacklistServiceDB, IpLocationServiceDB} from 'flyingfish_core';
import {DashboardInfoIpBlock, DashboardInfoResponse, StatusCodes} from 'flyingfish_schemas';
import {HimHIP} from '../../../inc/HimHIP/HimHIP.js';
import {HowIsMyPublicIpService} from '../../../inc/Service/HowIsMyPublicIpService.js';
import {IpService} from '../../../inc/Service/IpService.js';

/**
 * Info
 */
export class Info {

    /**
     * getInfo
     */
    public static async getInfo(): Promise<DashboardInfoResponse> {
        // ip blocks ---------------------------------------------------------------------------------------------------

        const ipblocks: DashboardInfoIpBlock[] = [];
        const ipblock_count = await IpBlacklistServiceDB.getInstance().countBlocks();

        const limit = 100;

        const entries = await IpBlacklistServiceDB.getInstance().findAllSorted(limit, 'DESC');

        if (entries) {
            for await (const entry of entries) {
                const tlocation = await IpLocationServiceDB.getInstance().findOne(entry.ip_location_id);

                if (tlocation) {
                    ipblocks.push({
                        id: entry.id,
                        ip: entry.ip,
                        info: `${tlocation.org}<br>${tlocation.city} - ${tlocation.postal_code}<br>${tlocation.country}`,
                        last_block: entry.last_block,
                        latitude: tlocation.latitude,
                        longitude: tlocation.longitude
                    });
                }
            }
        }

        // -------------------------------------------------------------------------------------------------------------

        return {
            public_ip: await HowIsMyPublicIpService.getInstance().getCurrentIp(false),
            public_ip_blacklisted: IpService.isBlacklisted,
            host: HimHIP.getData(),
            ipblocks: ipblocks,
            ipblock_count: ipblock_count,
            statusCode: StatusCodes.OK
        };
    }

}