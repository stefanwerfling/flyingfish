import {Body, Get, JsonController, Post, Session} from 'routing-controllers-extended';
import {In} from 'typeorm';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {IpBlacklist as IpBlacklistDB} from '../../inc/Db/MariaDb/Entity/IpBlacklist.js';
import {IpWhitelist as IpWhitelistDB} from '../../inc/Db/MariaDb/Entity/IpWhitelist.js';
import {IpBlacklistCategory as IpBlacklistCategoryDB} from '../../inc/Db/MariaDb/Entity/IpBlacklistCategory.js';
import {IpBlacklistMaintainer as IpBlacklistMaintainerDB} from '../../inc/Db/MariaDb/Entity/IpBlacklistMaintainer.js';
import {IpListMaintainer as IpListMaintainerDB} from '../../inc/Db/MariaDb/Entity/IpListMaintainer.js';
import {IpLocation as IpLocationDB} from '../../inc/Db/MariaDb/Entity/IpLocation.js';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn.js';
import {StatusCodes} from '../../inc/Routes/StatusCodes.js';
import {DateHelper} from '../../inc/Utils/DateHelper.js';

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
 * IpAccessBlackListImportSaveRequest
 */
export type IpAccessBlackListImportSaveRequest = {
    id: number;
    disable: boolean;
};

/**
 * IpAccessBlackListImportSaveResponse
 */
export type IpAccessBlackListImportSaveResponse = DefaultReturn;

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
 * IpAccessBlackListOwnsResponse
 */
export type IpAccessBlackListOwnsResponse = DefaultReturn & {
    list?: IpAccessBlackListOwn[];
    locations?: IpAccessLocation[];
};

/**
 * IpAccessBlackListOwnSaveRequest
 */
export type IpAccessBlackListOwnSaveRequest = {
    id: number;
    ip: string;
    disable: boolean;
    description: string;
};

/**
 * IpAccessBlackListOwnSaveResponse
 */
export type IpAccessBlackListOwnSaveResponse = DefaultReturn;

/**
 * IpAccessWhiteList
 */
export type IpAccessWhiteList = {
    id: number;
    ip: string;
    last_update: number;
    disable: boolean;
    last_access: number;
    count_access: number;
    ip_location_id?: number;
    description: string;
};

/**
 * IpAccessWhiteListResponse
 */
export type IpAccessWhiteListResponse = DefaultReturn & {
    list?: IpAccessWhiteList[];
    locations?: IpAccessLocation[];
};

/**
 * IpAccessWhiteSaveRequest
 */
export type IpAccessWhiteSaveRequest = {
    id: number;
    ip: string;
    disable: boolean;
    description: string;
};

/**
 * IpAccessWhiteSaveResponse
 */
export type IpAccessWhiteSaveResponse = DefaultReturn;

/**
 * IpAccessWhiteDeleteRequest
 */
export type IpAccessWhiteDeleteRequest = {
    id: number;
};

/**
 * IpAccessWhiteDeleteResponse
 */
export type IpAccessWhiteDeleteResponse = DefaultReturn;

/**
 * IpAccessBlackDeleteRequest
 */
export type IpAccessBlackDeleteRequest = {
    id: number;
};

/**
 * IpAccessBlackDeleteResponse
 */
export type IpAccessBlackDeleteResponse = DefaultReturn;

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
     * _getLocations
     * @param locationIds
     * @protected
     */
    protected async _getLocations(locationIds: number[]): Promise<IpAccessLocation[]> {
        const ipLocationRepository = DBHelper.getRepository(IpLocationDB);

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

        return locations;
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

            return {
                statusCode: StatusCodes.OK,
                list: list,
                locations: await this._getLocations(locationIds)
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * saveBlackListImport
     * @param session
     * @param request
     */
    @Post('/json/ipaccess/blacklist/import/save')
    public async saveBlackListImport(
        @Session() session: any,
        @Body() request: IpAccessBlackListImportSaveRequest
    ): Promise<IpAccessBlackListImportSaveResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);

            const entrie = await ipBlacklistRepository.findOne({
                where: {
                    id: request.id,
                    is_imported: true
                }
            });

            if (entrie) {
                entrie.disable = request.disable;

                await DBHelper.getDataSource().manager.save(entrie);

                return {
                    statusCode: StatusCodes.OK
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Entrie not found by id!'
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * getBlackListOwns
     * @param session
     */
    @Get('/json/ipaccess/blacklist/owns')
    public async getBlackListOwns(@Session() session: any): Promise<IpAccessBlackListOwnsResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);

            const entries = await ipBlacklistRepository.find({
                where: {
                    is_imported: false
                },
                order: {
                    last_block: 'DESC'
                }
            });

            const list: IpAccessBlackListOwn[] = [];
            const locationIds: number[] = [];

            if (entries) {
                for await (const entry of entries) {
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
                        ip_location_id: entry.ip_location_id,
                        description: entry.description
                    });
                }
            }

            return {
                statusCode: StatusCodes.OK,
                list: list,
                locations: await this._getLocations(locationIds)
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * saveBlackListOwn
     * @param session
     * @param request
     */
    @Post('/json/ipaccess/blacklist/own/save')
    public async saveBlackListOwn(
        @Session() session: any,
        @Body() request: IpAccessBlackListOwnSaveRequest
    ): Promise<IpAccessBlackListOwnSaveResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);

            let entrie = await ipBlacklistRepository.findOne({
                where: {
                    id: request.id,
                    is_imported: false
                }
            });

            if (!entrie) {
                entrie = new IpBlacklistDB();
            }

            entrie.ip = request.ip;
            entrie.disable = request.disable;
            entrie.description = request.description;
            entrie.is_imported = false;
            entrie.last_update = DateHelper.getCurrentDbTime();

            await DBHelper.getDataSource().manager.save(entrie);

            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * deleteBlacklist
     * @param session
     * @param request
     */
    @Post('/json/ipaccess/blacklist/delete')
    public async deleteBlacklist(@Session() session: any, @Body() request: IpAccessBlackDeleteRequest): Promise<IpAccessBlackDeleteResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);

            const result = await ipBlacklistRepository.delete({
                id: request.id,
                is_imported: false
            });

            if (result) {
                return {
                    statusCode: StatusCodes.OK
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * getWhiteList
     * @param session
     */
    @Get('/json/ipaccess/whitelist')
    public async getWhiteList(@Session() session: any): Promise<IpAccessWhiteListResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const ipWhitelistRepository = DBHelper.getRepository(IpWhitelistDB);

            const entries = await ipWhitelistRepository.find({
                order: {
                    last_access: 'DESC'
                }
            });

            const list: IpAccessWhiteList[] = [];
            const locationIds: number[] = [];

            if (entries) {
                for await (const entry of entries) {
                    if (entry.ip_location_id !== 0) {
                        locationIds.push(entry.ip_location_id);
                    }

                    list.push({
                        id: entry.id,
                        ip: entry.ip,
                        disable: entry.disable,
                        last_update: entry.last_update,
                        last_access: entry.last_access,
                        count_access: entry.count_access,
                        ip_location_id: entry.ip_location_id,
                        description: entry.description
                    });
                }
            }

            return {
                statusCode: StatusCodes.OK,
                list: list,
                locations: await this._getLocations(locationIds)
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * saveWhiteList
     * @param session
     * @param request
     */
    @Post('/json/ipaccess/whitelist/save')
    public async saveWhiteList(
        @Session() session: any,
        @Body() request: IpAccessWhiteSaveRequest
    ): Promise<IpAccessWhiteSaveResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const ipWhitelistRepository = DBHelper.getRepository(IpWhitelistDB);

            let entrie = await ipWhitelistRepository.findOne({
                where: {
                    id: request.id
                }
            });

            if (!entrie) {
                entrie = new IpWhitelistDB();
            }

            entrie.ip = request.ip;
            entrie.disable = request.disable;
            entrie.description = request.description;
            entrie.last_update = DateHelper.getCurrentDbTime();

            await DBHelper.getDataSource().manager.save(entrie);

            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * deleteWhitelist
     * @param session
     * @param request
     */
    @Post('/json/ipaccess/whitelist/delete')
    public async deleteWhitelist(@Session() session: any, @Body() request: IpAccessWhiteDeleteRequest): Promise<IpAccessWhiteDeleteResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const ipWhitelistRepository = DBHelper.getRepository(IpWhitelistDB);

            const result = await ipWhitelistRepository.delete({
                id: request.id
            });

            if (result) {
                return {
                    statusCode: StatusCodes.OK
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}