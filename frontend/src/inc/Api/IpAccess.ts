import {ExtractSchemaResultType, Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch';
import {SchemaDefaultReturn} from './Types/DefaultReturn';

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
export const SchemaIpAccessBlackListImportsResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaIpAccessBlackListImport)),
    locations: Vts.optional(Vts.array(SchemaIpAccessLocation))
});

export type IpAccessBlackListImportsResponse = ExtractSchemaResultType<typeof SchemaIpAccessBlackListImportsResponse>;

/**
 * BlacklistCategory
 */
export enum BlacklistCategory {
    reputation = 1,
    malware = 2,
    attacks = 3,
    abuse = 4,
    spam = 5,
    organizations = 6,
    geolocation = 7
}

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
export const SchemaIpAccessMaintainerResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaIpAccessMaintainer))
});

export type IpAccessMaintainerResponse = ExtractSchemaResultType<typeof SchemaIpAccessMaintainerResponse>;

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
export const SchemaIpAccessBlackListImportSaveResponse = SchemaDefaultReturn;
export type IpAccessBlackListImportSaveResponse = ExtractSchemaResultType<typeof SchemaIpAccessBlackListImportSaveResponse>;

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
export const SchemaIpAccessBlackListOwnsResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaIpAccessBlackListOwn)),
    locations: Vts.optional(Vts.array(SchemaIpAccessLocation))
});

export type IpAccessBlackListOwnsResponse = ExtractSchemaResultType<typeof SchemaIpAccessBlackListOwnsResponse>;

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
export const SchemaIpAccessBlackListOwnSaveResponse = SchemaDefaultReturn;
export type IpAccessBlackListOwnSaveResponse = ExtractSchemaResultType<typeof SchemaIpAccessBlackListOwnSaveResponse>;

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
export const SchemaIpAccessWhiteListResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaIpAccessWhiteList)),
    locations: Vts.optional(Vts.array(SchemaIpAccessLocation))
});

export type IpAccessWhiteListResponse = ExtractSchemaResultType<typeof SchemaIpAccessWhiteListResponse>;

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
export const SchemaIpAccessWhiteSaveResponse = SchemaDefaultReturn;
export type IpAccessWhiteSaveResponse = ExtractSchemaResultType<typeof SchemaIpAccessWhiteSaveResponse>;

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
export const SchemaIpAccessWhiteDeleteResponse = SchemaDefaultReturn;
export type IpAccessWhiteDeleteResponse = ExtractSchemaResultType<typeof SchemaIpAccessWhiteDeleteResponse>;

/**
 * IpAccessBlackDeleteRequest
 */
export const SchemaIpAccessBlackDeleteRequest = Vts.object({
    id: Vts.number()
});

export type IpAccessBlackDeleteRequest = ExtractSchemaResultType<typeof SchemaIpAccessBlackDeleteRequest>;

/**
 * IpAccessBlackDeleteResponse
 */
export const SchemaIpAccessBlackDeleteResponse = SchemaDefaultReturn;
export type IpAccessBlackDeleteResponse = ExtractSchemaResultType<typeof SchemaIpAccessBlackDeleteResponse>;

/**
 * IpAccess
 */
export class IpAccess {

    /**
     * getBlackListImports
     */
    public static async getBlackListImports(): Promise<IpAccessBlackListImportsResponse> {
        return NetFetch.getData('/json/ipaccess/blacklist/imports', SchemaIpAccessBlackListImportsResponse);
    }

    /**
     * saveBlackListImport
     * @param blocklistEntrie
     */
    public static async saveBlackListImport(blocklistEntrie: IpAccessBlackListImportSaveRequest): Promise<boolean> {
        await NetFetch.postData('/json/ipaccess/blacklist/import/save', blocklistEntrie, SchemaIpAccessBlackListImportSaveResponse);
        return true;
    }

    /**
     * getMaintainerList
     */
    public static async getMaintainerList(): Promise<IpAccessMaintainer[]> {
        const result = await NetFetch.getData('/json/ipaccess/maintainer/list', SchemaIpAccessMaintainerResponse);
        return result.list;
    }

    /**
     * getBlackListOwns
     */
    public static async getBlackListOwns(): Promise<IpAccessBlackListOwnsResponse> {
        return NetFetch.getData('/json/ipaccess/blacklist/owns', SchemaIpAccessBlackListOwnsResponse);
    }

    /**
     * saveBlackListOwn
     * @param blacklistEntrie
     */
    public static async saveBlackListOwn(blacklistEntrie: IpAccessBlackListOwnSaveRequest): Promise<boolean> {
        await NetFetch.postData('/json/ipaccess/blacklist/own/save', blacklistEntrie, SchemaIpAccessBlackListOwnSaveResponse);
        return true;
    }

    /**
     * deleteBlackList
     * @param blacklist
     */
    public static async deleteBlackList(blacklist: IpAccessBlackDeleteRequest): Promise<boolean> {
        await NetFetch.postData('/json/ipaccess/blacklist/delete', blacklist, SchemaIpAccessBlackDeleteResponse);
        return true;
    }

    /**
     * getWhiteList
     */
    public static async getWhiteList(): Promise<IpAccessWhiteListResponse> {
        return NetFetch.getData('/json/ipaccess/whitelist', SchemaIpAccessWhiteListResponse);
    }

    /**
     * saveWhiteList
     * @param whitelistEntrie
     */
    public static async saveWhiteList(whitelistEntrie: IpAccessWhiteSaveRequest): Promise<boolean> {
        await NetFetch.postData('/json/ipaccess/whitelist/save', whitelistEntrie, SchemaIpAccessWhiteSaveResponse);
        return true;
    }

    /**
     * deleteWhitelist
     * @param whitelist
     */
    public static async deleteWhitelist(whitelist: IpAccessWhiteDeleteRequest): Promise<boolean> {
        await NetFetch.postData('/json/ipaccess/whitelist/delete', whitelist, SchemaIpAccessWhiteDeleteResponse);
        return true;
    }

}