/**
 * IDynDnsUpdate
 */
export type IDynDnsUpdate = {
    result: boolean;
    status: number;
};

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
     * getStatusMsg
     * @param status
     */
    getStatusMsg(status: number): string;

    /**
     * update
     * @param username
     * @param password
     * @param ip
     */
    update(username: string, password: string, ip: string): Promise<IDynDnsUpdate>;

    /**
     * getHosts
     * @param username
     * @param password
     */
    getHosts(username: string, password: string): Promise<string[]>;

}