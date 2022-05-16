import {IDynDnsProvider} from '../IDynDnsProvider';

/**
 * Selfhost
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
        return false;
    }

}