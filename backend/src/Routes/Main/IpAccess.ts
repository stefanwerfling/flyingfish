import {Router} from 'express';
import {In} from 'typeorm';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {IpBlacklist as IpBlacklistDB} from '../../inc/Db/MariaDb/Entity/IpBlacklist.js';
import {IpWhitelist as IpWhitelistDB} from '../../inc/Db/MariaDb/Entity/IpWhitelist.js';
import {IpBlacklistCategory as IpBlacklistCategoryDB} from '../../inc/Db/MariaDb/Entity/IpBlacklistCategory.js';
import {IpBlacklistMaintainer as IpBlacklistMaintainerDB} from '../../inc/Db/MariaDb/Entity/IpBlacklistMaintainer.js';
import {IpListMaintainer as IpListMaintainerDB} from '../../inc/Db/MariaDb/Entity/IpListMaintainer.js';
import {IpLocation as IpLocationDB} from '../../inc/Db/MariaDb/Entity/IpLocation.js';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn.js';
import {DefaultRoute} from '../../inc/Routes/DefaultRoute.js';
import {StatusCodes} from '../../inc/Routes/StatusCodes.js';
import {DateHelper} from '../../inc/Utils/DateHelper.js';

/**
 * IpAccessLocation
 */
export const SchemaIpAccessLocation = Vts.object({
    id: Vts.number(),
    ip: Vts.string(),
    country: Vts.string(),
    country_code: Vts.string(),
    city: Vts.string(),
    continent: Vts.string(),
    latitude: Vts.string(),
    longitude: Vts.string(),
    time_zone: Vts.string(),
    postal_code: Vts.string(),
    org: Vts.string(),
    asn: Vts.string()
});

export type IpAccessLocation = ExtractSchemaResultType<typeof SchemaIpAccessLocation>;

/**
 * IpAccessBlackListImport
 */
export const SchemaIpAccessBlackListImport = Vts.object({
    id: Vts.number(),
    ip: Vts.string(),
    last_update: Vts.number(),
    disable: Vts.boolean(),
    last_block: Vts.number(),
    count_block: Vts.number(),
    categorys: Vts.array(Vts.number()),
    maintainers: Vts.array(Vts.number()),
    ip_location_id: Vts.optional(Vts.number())
});

export type IpAccessBlackListImport = ExtractSchemaResultType<typeof SchemaIpAccessBlackListImport>;

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
export const SchemaIpAccessMaintainer = Vts.object({
    id: Vts.number(),
    maintainer_name: Vts.string(),
    maintainer_url: Vts.string(),
    list_source_url: Vts.string()
});

export type IpAccessMaintainer = ExtractSchemaResultType<typeof SchemaIpAccessMaintainer>;

/**
 * IpAccessMaintainerResponse
 */
export type IpAccessMaintainerResponse = DefaultReturn & {
    list?: IpAccessMaintainer[];
};

/**
 * IpAccessBlackListImportSaveRequest
 */
export const SchemaIpAccessBlackListImportSaveRequest = Vts.object({
    id: Vts.number(),
    disable: Vts.boolean()
});

export type IpAccessBlackListImportSaveRequest = ExtractSchemaResultType<typeof SchemaIpAccessBlackListImportSaveRequest>;

/**
 * IpAccessBlackListImportSaveResponse
 */
export type IpAccessBlackListImportSaveResponse = DefaultReturn;

/**
 * IpAccessBlackListOwn
 */
export const SchemaIpAccessBlackListOwn = Vts.object({
    id: Vts.number(),
    ip: Vts.string(),
    last_update: Vts.number(),
    disable: Vts.boolean(),
    last_block: Vts.number(),
    count_block: Vts.number(),
    ip_location_id: Vts.optional(Vts.number()),
    description: Vts.string()
});

export type IpAccessBlackListOwn = ExtractSchemaResultType<typeof SchemaIpAccessBlackListOwn>;

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
export const SchemaIpAccessBlackListOwnSaveRequest = Vts.object({
    id: Vts.number(),
    ip: Vts.string(),
    disable: Vts.boolean(),
    description: Vts.string()
});

export type IpAccessBlackListOwnSaveRequest = ExtractSchemaResultType<typeof SchemaIpAccessBlackListOwnSaveRequest>;

/**
 * IpAccessBlackListOwnSaveResponse
 */
export type IpAccessBlackListOwnSaveResponse = DefaultReturn;

/**
 * IpAccessWhiteList
 */
export const SchemaIpAccessWhiteList = Vts.object({
    id: Vts.number(),
    ip: Vts.string(),
    last_update: Vts.number(),
    disable: Vts.boolean(),
    last_access: Vts.number(),
    count_access: Vts.number(),
    ip_location_id: Vts.optional(Vts.number()),
    description: Vts.string()
});

export type IpAccessWhiteList = ExtractSchemaResultType<typeof SchemaIpAccessWhiteList>;

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
export const SchemaIpAccessWhiteSaveRequest = Vts.object({
    id: Vts.number(),
    ip: Vts.string(),
    disable: Vts.boolean(),
    description: Vts.string()
});

export type IpAccessWhiteSaveRequest = ExtractSchemaResultType<typeof SchemaIpAccessWhiteSaveRequest>;

/**
 * IpAccessWhiteSaveResponse
 */
export type IpAccessWhiteSaveResponse = DefaultReturn;

/**
 * IpAccessWhiteDeleteRequest
 */
export const SchemaIpAccessWhiteDeleteRequest = Vts.object({
    id: Vts.number()
});

export type IpAccessWhiteDeleteRequest = ExtractSchemaResultType<typeof SchemaIpAccessWhiteDeleteRequest>;

/**
 * IpAccessWhiteDeleteResponse
 */
export type IpAccessWhiteDeleteResponse = DefaultReturn;

/**
 * IpAccessBlackDeleteRequest
 */
const SchemaIpAccessBlackDeleteRequest = Vts.object({
    id: Vts.number()
});

export type IpAccessBlackDeleteRequest = ExtractSchemaResultType<typeof SchemaIpAccessBlackDeleteRequest>;

/**
 * IpAccessBlackDeleteResponse
 */
export type IpAccessBlackDeleteResponse = DefaultReturn;

/**
 * IpAccess
 */
export class IpAccess extends DefaultRoute {

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * getMaintainerList
     */
    public async getMaintainerList(): Promise<IpAccessMaintainerResponse> {
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
    public async getBlackListImports(): Promise<IpAccessBlackListImportsResponse> {
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

    /**
     * saveBlackListImport
     * @param request
     */
    public async saveBlackListImport(request: IpAccessBlackListImportSaveRequest): Promise<IpAccessBlackListImportSaveResponse> {
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

    /**
     * getBlackListOwns
     */
    public async getBlackListOwns(): Promise<IpAccessBlackListOwnsResponse> {
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

    /**
     * saveBlackListOwn
     * @param data
     */
    public async saveBlackListOwn(data: IpAccessBlackListOwnSaveRequest): Promise<IpAccessBlackListOwnSaveResponse> {
        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);

        let entrie = await ipBlacklistRepository.findOne({
            where: {
                id: data.id,
                is_imported: false
            }
        });

        if (!entrie) {
            entrie = new IpBlacklistDB();
        }

        entrie.ip = data.ip;
        entrie.disable = data.disable;
        entrie.description = data.description;
        entrie.is_imported = false;
        entrie.last_update = DateHelper.getCurrentDbTime();

        await DBHelper.getDataSource().manager.save(entrie);

        return {
            statusCode: StatusCodes.OK
        };
    }

    /**
     * deleteBlacklist
     * @param data
     */
    public async deleteBlacklist(data: IpAccessBlackDeleteRequest): Promise<IpAccessBlackDeleteResponse> {
        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);

        const result = await ipBlacklistRepository.delete({
            id: data.id,
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

    /**
     * getWhiteList
     */
    public async getWhiteList(): Promise<IpAccessWhiteListResponse> {
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

    /**
     * saveWhiteList
     * @param data
     */
    public async saveWhiteList(data: IpAccessWhiteSaveRequest): Promise<IpAccessWhiteSaveResponse> {
        const ipWhitelistRepository = DBHelper.getRepository(IpWhitelistDB);

        let entrie = await ipWhitelistRepository.findOne({
            where: {
                id: data.id
            }
        });

        if (!entrie) {
            entrie = new IpWhitelistDB();
        }

        entrie.ip = data.ip;
        entrie.disable = data.disable;
        entrie.description = data.description;
        entrie.last_update = DateHelper.getCurrentDbTime();

        await DBHelper.getDataSource().manager.save(entrie);

        return {
            statusCode: StatusCodes.OK
        };
    }

    /**
     * deleteWhitelist
     * @param data
     */
    public async deleteWhitelist(data: IpAccessWhiteDeleteRequest): Promise<IpAccessWhiteDeleteResponse> {
        const ipWhitelistRepository = DBHelper.getRepository(IpWhitelistDB);

        const result = await ipWhitelistRepository.delete({
            id: data.id
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

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/ipaccess/maintainer/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getMaintainerList());
                }
            }
        );

        this._routes.get(
            '/json/ipaccess/blacklist/imports',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getBlackListImports());
                }
            }
        );

        this._routes.post(
            '/json/ipaccess/blacklist/import/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaIpAccessBlackListImportSaveRequest, req.body, res)) {
                        res.status(200).json(await this.saveBlackListImport(req.body));
                    }
                }
            }
        );

        this._routes.get(
            '/json/ipaccess/blacklist/owns',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getBlackListOwns());
                }
            }
        );

        this._routes.post(
            '/json/ipaccess/blacklist/own/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaIpAccessBlackListOwnSaveRequest, req.body, res)) {
                        res.status(200).json(await this.saveBlackListOwn(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/ipaccess/blacklist/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaIpAccessBlackDeleteRequest, req.body, res)) {
                        res.status(200).json(await this.deleteBlacklist(req.body));
                    }
                }
            }
        );

        this._routes.get(
            '/json/ipaccess/whitelist',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getWhiteList());
                }
            }
        );

        this._routes.post(
            '/json/ipaccess/whitelist/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaIpAccessWhiteSaveRequest, req.body, res)) {
                        res.status(200).json(await this.saveWhiteList(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/ipaccess/whitelist/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaIpAccessWhiteDeleteRequest, req.body, res)) {
                        res.status(200).json(await this.deleteWhitelist(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}