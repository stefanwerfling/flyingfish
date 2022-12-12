import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

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
 * IpAccess
 */
export class IpAccess {

    /**
     * getBlackListImports
     */
    public static async getBlackListImports(): Promise<IpAccessBlackListImportsResponse | null> {
        const result = await NetFetch.getData('/json/ipaccess/blacklist/imports');

        if (result && result.statusCode) {
            const response = result as IpAccessBlackListImportsResponse;

            switch (result.statusCode) {
                case StatusCodes.OK:
                    return response;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    public static async getMaintainerList(): Promise<IpAccessMaintainer[] | null> {
        const result = await NetFetch.getData('/json/ipaccess/maintainer/list');

        if (result && result.statusCode) {
            const response = result as IpAccessMaintainerResponse;

            switch (result.statusCode) {
                case StatusCodes.OK:
                    return response.list!;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

}