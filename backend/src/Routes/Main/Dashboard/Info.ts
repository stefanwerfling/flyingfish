import {DBHelper} from 'flyingfish_core';
import {DashboardInfoIpBlock, DashboardInfoResponse, StatusCodes} from 'flyingfish_schemas';
import {IpBlacklist as IpBlacklistDB} from '../../../inc/Db/MariaDb/Entity/IpBlacklist.js';
import {IpLocation as IpLocationDB} from '../../../inc/Db/MariaDb/Entity/IpLocation.js';
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
        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);
        const ipLocationRepository = DBHelper.getRepository(IpLocationDB);

        // ip blocks ---------------------------------------------------------------------------------------------------

        const ipblocks: DashboardInfoIpBlock[] = [];
        let ipblock_count = 0;

        const limit = 100;

        const result = await ipBlacklistRepository
        .createQueryBuilder('countipblocks')
        .select('SUM(countipblocks.count_block)', 'total_count_blocks')
        .addSelect('COUNT(*)', 'count')
        .getRawOne();

        if (result) {
            ipblock_count = parseInt(result.total_count_blocks, 10) ?? 0;
        }

        const entries = await ipBlacklistRepository.find({
            take: limit,
            order: {
                last_block: 'DESC'
            }
        });

        if (entries) {
            for await (const entry of entries) {
                const tlocation = await ipLocationRepository.findOne({
                    where: {
                        id: entry.ip_location_id
                    }
                });

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
            public_ip: await HowIsMyPublicIpService.getInstance().getCurrentIp(),
            public_ip_blacklisted: IpService.isBlacklisted,
            host: HimHIP.getData(),
            ipblocks: ipblocks,
            ipblock_count: ipblock_count,
            statusCode: StatusCodes.OK
        };
    }

}