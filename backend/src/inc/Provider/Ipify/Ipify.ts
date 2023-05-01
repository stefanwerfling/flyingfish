import {Logger} from 'flyingfish_core';
import got from 'got';
import {IHowIsMyPublicIp} from '../IHowIsMyPublicIp.js';

/**
 * IpifyResponse
 */
export type IpifyResponse = {
    ip: string;
};

/**
 * Ipify
 */
export class Ipify implements IHowIsMyPublicIp {

    /**
     * getName
     */
    public static getName(): string {
        return 'ipify';
    }

    /**
     * getName
     */
    public getName(): string {
        return Ipify.getName();
    }

    /**
     * get
     */
    public async get(): Promise<string | null> {
        try {
            const response = await got({
                url: 'https://api.ipify.org?format=json',
                responseType: 'json'
            });

            if (response.body) {
                const data = response.body as IpifyResponse;

                return data.ip;
            }
        } catch (e) {
            Logger.getLogger().error('Ipify::get:');
            Logger.getLogger().error(e);
        }

        return null;
    }

}