import {
    DynDnsClientHostsOptions,
    DynDnsClientUpdateOptions,
    DynDnsClientUpdateResult, IDynDnsClient,
    Logger
} from 'flyingfish_core';

/**
 * NoIP
 * @see https://www.noip.com/de-DE/integrate/request
 */
export class NoIp implements IDynDnsClient {

    public static readonly URL = 'https://{auth}dynupdate.no-ip.com/nic/update';

    /**
     * Static Name
     */
    public static getName(): string {
        return 'noip';
    }

    /**
     * Static Title
     */
    public static getTitle(): string {
        return 'NoIP';
    }

    /**
     * Get the name of client
     * @returns {string}
     */
    public getName(): string {
        return NoIp.getName();
    }

    /**
     * Get the title of title
     * @returns {string}
     */
    public getTitle(): string {
        return NoIp.getTitle();
    }

    /**
     * Return all supported hostnames
     * @param {DynDnsClientHostsOptions} options
     * @returns {string[]}
     */
    public async getHosts(options: DynDnsClientHostsOptions): Promise<string[]> {
        return Promise.resolve([]);
    }

    public getStatusMsg(status: number): string {
        return 'unknow';
    }

    /**
     * Update hostname[s] with the IP
     * @param {DynDnsClientUpdateOptions} options
     * @returns {DynDnsClientUpdateResult}
     */
    public async update(options: DynDnsClientUpdateOptions): Promise<DynDnsClientUpdateResult> {
        const tresult: DynDnsClientUpdateResult = {
            result: false,
            status: 0
        };

        try {

        } catch (e) {
            Logger.getLogger().error(e);
        }

        return tresult;
    }

}