import {Get, JsonController, Session} from 'routing-controllers-extended';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {IpBlacklist as IpBlacklistDB} from '../../inc/Db/MariaDb/Entity/IpBlacklist.js';
import {IpLocation as IpLocationDB} from '../../inc/Db/MariaDb/Entity/IpLocation.js';
import {HimHIP, HimHIPData} from '../../inc/HimHIP/HimHIP.js';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn.js';
import {StatusCodes} from '../../inc/Routes/StatusCodes.js';
import {HowIsMyPublicIpService} from '../../inc/Service/HowIsMyPublicIpService.js';

/**
 * DashboardInfoIpBlock
 */
export type DashboardInfoIpBlock = {
    ip: string;
    info: string;
    last_block: number;
    latitude: string;
    longitude: string;
};

/**
 * DashboardInfoResponse
 */
export type DashboardInfoResponse = DefaultReturn & {
    public_ip: string|null;
    host: HimHIPData|null;
    ipblocks: DashboardInfoIpBlock[];
    ipblock_count: number;
};

/**
 * Dashboard
 */
@JsonController()
export class Dashboard {

    /**
     * getInfo
     */
    @Get('/json/dashboard/info')
    public async getInfo(@Session() session: any): Promise<DashboardInfoResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);
            const ipLocationRepository = DBHelper.getRepository(IpLocationDB);

            // ip blocks -----------------------------------------------------------------------------------------------
            const ipblocks: DashboardInfoIpBlock[] = [];
            let ipblock_count = 0;

            const limit = 40;

            const result = await ipBlacklistRepository
            .createQueryBuilder('countipblocks')
            .select('SUM(countipblocks.count_block)', 'total_count_blocks')
            .addSelect('COUNT(*)', 'count')
            .getRawOne();

            if (result) {
                ipblock_count = result.total_count_blocks;
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
                            ip: entry.ip,
                            info: '',
                            last_block: entry.last_block,
                            latitude: tlocation.latitude,
                            longitude: tlocation.longitude
                        });
                    }
                }
            }

            // ---------------------------------------------------------------------------------------------------------

            return {
                public_ip: await HowIsMyPublicIpService.getInstance().getCurrentIp(),
                host: HimHIP.getData(),
                ipblocks: ipblocks,
                ipblock_count: ipblock_count,
                statusCode: StatusCodes.OK
            };
        }

        return {
            public_ip: null,
            host: null,
            ipblocks: [],
            ipblock_count: 0,
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}