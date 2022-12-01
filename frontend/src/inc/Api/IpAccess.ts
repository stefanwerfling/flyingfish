import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

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
};

/**
 * IpAccessBlackListImportsResponse
 */
export type IpAccessBlackListImportsResponse = DefaultReturn & {
    list?: IpAccessBlackListImport[];
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
 * IpAccess
 */
export class IpAccess {

    /**
     * getBlackListImports
     */
    public static async getBlackListImports(): Promise<IpAccessBlackListImport[] | null> {
        const result = await NetFetch.getData('/json/ipaccess/blacklist/imports');

        if (result && result.statusCode) {
            const response = result as IpAccessBlackListImportsResponse;

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