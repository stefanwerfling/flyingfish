import {
    IpAccessBlackDeleteRequest,
    IpAccessBlackListImportSaveRequest,
    IpAccessBlackListImportsResponse,
    IpAccessBlackListOwnSaveRequest,
    IpAccessBlackListOwnsResponse,
    IpAccessMaintainer,
    IpAccessWhiteDeleteRequest,
    IpAccessWhiteListResponse,
    IpAccessWhiteSaveRequest,
    SchemaIpAccessBlackDeleteResponse,
    SchemaIpAccessBlackListImportSaveResponse,
    SchemaIpAccessBlackListImportsResponse,
    SchemaIpAccessBlackListOwnSaveResponse,
    SchemaIpAccessBlackListOwnsResponse,
    SchemaIpAccessMaintainerResponse,
    SchemaIpAccessWhiteDeleteResponse,
    SchemaIpAccessWhiteListResponse,
    SchemaIpAccessWhiteSaveResponse
} from 'flyingfish_schemas';
import {Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch.js';
import {UnknownResponse} from './Error/UnknownResponse.js';

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

        if (Vts.isUndefined(result.list)) {
            throw new UnknownResponse('IP Access maintainer return empty list!');
        }

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