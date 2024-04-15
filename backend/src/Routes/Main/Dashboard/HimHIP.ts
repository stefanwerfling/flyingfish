import {RedisChannels, RedisClient} from 'flyingfish_core';
import {DefaultReturn, HimHIPUpdate, StatusCodes} from 'flyingfish_schemas';

export class HimHIP {

    /**
     * Refrech HimHIP data information
     */
    public static async refrechHimHIP(): Promise<DefaultReturn> {
        if (RedisClient.hasInstance()) {
            const client = RedisClient.getInstance();
            await client.sendChannel(
                RedisChannels.HIMHIP_UPDATE_REQ,
                JSON.stringify({
                    update: true
                } as HimHIPUpdate)
            );
        }

        return {
            statusCode: StatusCodes.OK
        };
    }

}