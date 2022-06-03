import got from 'got';
import {Logger} from '../../Logger/Logger';
import {IDynDnsProvider} from '../IDynDnsProvider';

/**
 * Selfhost
 * @see https://selfhost.de/cgi-bin/selfhost?p=document&name=api
 */
export class Selfhost implements IDynDnsProvider {

    /**
     * getName
     */
    public static getName(): string {
        return 'selfhost';
    }

    /**
     * getName
     */
    public getName(): string {
        return Selfhost.getName();
    }

    /**
     * update
     * @param username
     * @param password
     * @param ip
     */
    public async update(username: string, password: string, ip: string = ''): Promise<boolean> {
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

        return false;
    }

}