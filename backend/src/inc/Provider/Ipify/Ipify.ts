import got from 'got';
import {IHowIsMyPublicIp} from '../IHowIsMyPublicIp';

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
        const response = await got({
            url: 'https://api.ipify.org?format=json',
            responseType: 'json'
        });

        if (response.body) {
            const data = response.body as IpifyResponse;

            return data.ip;
        }

        return null;
    }

}