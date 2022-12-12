import {Get, JsonController, Session} from 'routing-controllers-extended';
import {In} from 'typeorm';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {IpBlacklist as IpBlacklistDB} from '../../inc/Db/MariaDb/Entity/IpBlacklist.js';
import {IpBlacklistCategory as IpBlacklistCategoryDB} from '../../inc/Db/MariaDb/Entity/IpBlacklistCategory.js';
import {IpBlacklistMaintainer as IpBlacklistMaintainerDB} from '../../inc/Db/MariaDb/Entity/IpBlacklistMaintainer.js';
import {IpListMaintainer as IpListMaintainerDB} from '../../inc/Db/MariaDb/Entity/IpListMaintainer.js';
import {IpLocation as IpLocationDB} from '../../inc/Db/MariaDb/Entity/IpLocation.js';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn.js';
import {StatusCodes} from '../../inc/Routes/StatusCodes.js';

/**
 * IpAccessLocation
 */
export type IpAccessLocation = {
    id: number;
    ip: string;
    country: string;
    country_code: string;
    city: string;
    continent: string;
    latitude: string;
    longitude: string;
    time_zone: string;
    postal_code: string;
    org: string;
    asn: string;
};

/**
 * IpAccessBlackListImport
 */
export type IpAccessBlackListImport = {
    id: number;
    ip: string;
    last_update: number;
    disable: boolean;
    last_block: number;
    count_block: number;
    categorys: number[];
    maintainers: number[];
    ip_location_id?: number;
};

/**
 * IpAccessBlackListImportsResponse
 */
export type IpAccessBlackListImportsResponse = DefaultReturn & {
    list?: IpAccessBlackListImport[];
    locations?: IpAccessLocation[];
};

/**
 * IpAccessMaintainer
 */
export type IpAccessMaintainer = {
    id: number;
    maintainer_name: string;
    maintainer_url: string;
    list_source_url: string;
};

/**
 * IpAccessMaintainerResponse
 */
export type IpAccessMaintainerResponse = DefaultReturn & {
    list?: IpAccessMaintainer[];
};

/**
 * IpAccessBlackListOwn
 */
export type IpAccessBlackListOwn = {
    id: number;
    ip: string;
    last_update: number;
    disable: boolean;
    last_block: number;
    count_block: number;
    ip_location_id?: number;
    description: string;
};

/**
 * IpAccess
 */
@JsonController()
export class IpAccess {

    /**
     * getMaintainerList
     * @param session
     */
    @Get('/json/ipaccess/maintainer/list')
    public async getMaintainerList(@Session() session: any): Promise<IpAccessMaintainerResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const ipListMaintainerRepository = DBHelper.getRepository(IpListMaintainerDB);
            const maintainers = await ipListMaintainerRepository.find();

            const list: IpAccessMaintainer[] = [];

            for (const maintainer of maintainers) {
                list.push({
                    id: maintainer.id,
                    maintainer_name: maintainer.maintainer_name,
                    maintainer_url: maintainer.maintainer_url,
                    list_source_url: maintainer.list_source_url
                });
            }

            return {
                statusCode: StatusCodes.OK,
                list: list
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * getBlackList
     */
    @Get('/json/ipaccess/blacklist/imports')
    public async getBlackListImports(@Session() session: any): Promise<IpAccessBlackListImportsResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const limit = 20;

            const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);
            const ipBlacklistCategoryRepository = DBHelper.getRepository(IpBlacklistCategoryDB);
            const ipBlacklistMaintainerRepository = DBHelper.getRepository(IpBlacklistMaintainerDB);
            const ipLocationRepository = DBHelper.getRepository(IpLocationDB);

            const entries = await ipBlacklistRepository.find({
                take: limit,
                where: {
                    is_imported: true
                },
                order: {
                    last_block: 'DESC'
                }
            });

            const list: IpAccessBlackListImport[] = [];
            const locationIds: number[] = [];

            if (entries) {
                for await (const entry of entries) {
                    const categorys: number[] = [];
                    const maintainers: number[] = [];

                    const cats = await ipBlacklistCategoryRepository.find({
                        where: {
                            ip_id: entry.id
                        }
                    });

                    if (cats) {
                        for (const cat of cats) {
                            categorys.push(cat.cat_num);
                        }
                    }

                    const maints = await ipBlacklistMaintainerRepository.find({
                        where: {
                            ip_id: entry.id
                        }
                    });

                    if (maints) {
                        for (const maint of maints) {
                            maintainers.push(maint.ip_maintainer_id);
                        }
                    }

                    if (entry.ip_location_id !== 0) {
                        locationIds.push(entry.ip_location_id);
                    }

                    list.push({
                        id: entry.id,
                        ip: entry.ip,
                        disable: entry.disable,
                        last_update: entry.last_update,
                        last_block: entry.last_block,
                        count_block: entry.count_block,
                        categorys: categorys,
                        maintainers: maintainers,
                        ip_location_id: entry.ip_location_id
                    });
                }
            }

            const locations: IpAccessLocation[] = [];

            const tlocations = await ipLocationRepository.find({
                where: {
                    id: In(locationIds)
                }
            });

            if (tlocations) {
                for (const tlocation of tlocations) {
                    locations.push({
                        id: tlocation.id,
                        ip: tlocation.ip,
                        country: tlocation.country,
                        country_code: tlocation.country_code,
                        city: tlocation.city,
                        continent: tlocation.continent,
                        latitude: tlocation.latitude,
                        longitude: tlocation.longitude,
                        time_zone: tlocation.time_zone,
                        postal_code: tlocation.postal_code,
                        org: tlocation.org,
                        asn: tlocation.asn
                    });
                }
            }

            return {
                statusCode: StatusCodes.OK,
                list: list,
                locations: locations
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}