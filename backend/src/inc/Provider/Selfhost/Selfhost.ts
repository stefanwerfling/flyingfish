import got from 'got';
import {Logger} from '../../Logger/Logger';
import {IDynDns} from '../IDynDns';

/**
 * Selfhost
 * @see https://selfhost.de/cgi-bin/selfhost?p=document&name=api
 */
export class Selfhost implements IDynDns {

    /**
     * getName
     */
    public static getName(): string {
        return 'selfhost';
    }

    /**
     * getTitle
     */
    public static getTitle(): string {
        return 'SelfHost';
    }

    /**
     * getName
     */
    public getName(): string {
        return Selfhost.getName();
    }

    /**
     * getTitle
     */
    public getTitle(): string {
        return Selfhost.getTitle();
    }

    /**
     * update
     * @param username
     * @param password
     * @param ip
     */
    public async update(username: string, password: string, ip: string = ''): Promise<boolean> {
        try {
            let myip = '';

            if (ip !== '') {
                myip = `&myip=${ip}`;
            }

            const response = await got({
                url: `https://carol.selfhost.de/update?username=${username}&password=${password}${myip}`
            });

            Logger.getLogger().info(`Selfhost update status code: ${response.statusCode}`);

            if (response.statusCode === 200) {
                return true;
            }
        } catch (e) {
            Logger.getLogger().error(e);
        }

        return false;
    }

}