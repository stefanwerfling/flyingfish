/**
 * Type of DynDns Client update result
 */
export type DynDnsClientUpdateResult = {
    result: boolean;
    status: number;
};

/**
 * Type of DynDns client update options
 */
export type DynDnsClientUpdateOptions = {
    username: string;
    password: string;
    ip: string|null;
    ip6: string|null;
    hostname: string[];
};

/**
 * Type of DynDns client hosts options
 */
export type DynDnsClientHostsOptions = {
    username: string;
    password: string;
};

/**
 * Interface of DynDns Client
 */
export interface IDynDnsClient {

    /**
     * Get the name of client
     * @returns {string}
     */
    getName(): string;

    /**
     * Get the title of title
     * @returns {string}
     */
    getTitle(): string;

    /**
     * Return the Msg status
     * @param {number} status
     * @returns {string}
     */
    getStatusMsg(status: number): string;

    /**
     * Update hostname[s] with the IP
     * @param {DynDnsClientUpdateOptions} options
     * @returns {DynDnsClientUpdateResult}
     */
    update(options: DynDnsClientUpdateOptions): Promise<DynDnsClientUpdateResult>;

    /**
     * Return all supported hostnames
     * @param {DynDnsClientHostsOptions} options
     * @returns {string[]}
     */
    getHosts(options: DynDnsClientHostsOptions): Promise<string[]>;

}