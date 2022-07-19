/**
 * IDynDnsProvider
 */
export interface IDynDns {

    /**
     * getName
     */
    getName(): string;

    /**
     * getTitle
     */
    getTitle(): string;

    /**
     * update
     * @param username
     * @param password
     * @param ip
     */
    update(username: string, password: string, ip: string): Promise<boolean>;
}