import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * GatewayIdentifierEntry
 */
export type GatewayIdentifierEntry = {
    id: number;
    networkname: string;
    mac_address: string;
    address: string;
    color: string;
};

/**
 * GatewayIdentifierListResponse
 */
export type GatewayIdentifierListResponse = DefaultReturn & {
    data?: GatewayIdentifierEntry[];
};

/**
 * GatewayIdentifierSaveResponse
 */
export type GatewayIdentifierSaveResponse = DefaultReturn;

/**
 * GatewayIdentifierDelete
 */
export type GatewayIdentifierDelete = {
    id: number;
};

/**
 * GatewayIdentifier
 */
export class GatewayIdentifier {

    /**
     * getList
     */
    public static async getList(): Promise<GatewayIdentifierEntry[] | null> {
        const result = await NetFetch.getData('/json/gatewayidentifier/list');

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return result.data as GatewayIdentifierEntry[];

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * save
     * @param upnpnat
     */
    public static async save(gateway: GatewayIdentifierEntry): Promise<boolean> {
        const result = await NetFetch.postData('/json/gatewayidentifier/save', gateway);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return true;
            }
        }

        return false;
    }

    /**
     * delete
     * @param id
     */
    public static async delete(id: number): Promise<boolean> {
        const request: GatewayIdentifierDelete = {
            id: id
        };

        const result = await NetFetch.postData('/json/gatewayidentifier/delete', request);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return true;
            }
        }

        return false;
    }

}