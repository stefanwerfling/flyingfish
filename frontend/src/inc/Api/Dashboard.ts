import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * HimHIPData
 */
export type HimHIPData = {
    gatewaymac: string;
    network: string;
    gateway: string;
    interface: string;
    hostip: string;
};

/**
 * DashboardInfoResponse
 */
export type DashboardInfoResponse = DefaultReturn & {
    public_ip: string|null;
    host: HimHIPData|null;
};

/**
 * Dashboard
 */
export class Dashboard {

    /**
     * getInfo
     */
    public static async getInfo(): Promise<DashboardInfoResponse|null> {
        const result = await NetFetch.getData('/json/dashboard/info');

        if (result && result.statusCode) {
            const resultContent = result as DashboardInfoResponse;

            switch (resultContent.statusCode) {
                case StatusCodes.OK:
                    return resultContent;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

}