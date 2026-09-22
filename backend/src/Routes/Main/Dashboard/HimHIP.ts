import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';

/**
 * HimHIP dashboard helper.
 */
export class HimHIP {

    /**
     * Refresh HimHIP data — a no-op now: the `netdevice` part pushes the host/gateway
     * facts over HTTP on its reconcile cadence (the former Redis "request update" channel
     * was removed). Kept so the dashboard refresh button still returns OK.
     */
    public static async refrechHimHIP(): Promise<DefaultReturn> {
        return {
            statusCode: StatusCodes.OK
        };
    }

}
