import {
    DynDnsClientHostsOptions,
    DynDnsClientUpdateOptions,
    DynDnsClientUpdateResult,
    IDynDnsClient,
    Logger
} from 'flyingfish_core';
import got from 'got';

export type NoIpReturn = {
    statusCode: string;
    msg?: string;
};

/**
 * NoIP
 * @see https://www.noip.com/de-DE/integrate/request
 * @see https://www.noip.com/de-DE/integrate/response
 */
export class NoIp implements IDynDnsClient {

    public static readonly URL = 'https://{auth}dynupdate.no-ip.com/nic/update';

    public static readonly RETURN_GOOD = 'good';
    public static readonly RETURN_NOCHG = 'nochg';
    public static readonly RETURN_NOHOST = 'nohost';
    public static readonly RETURN_BADAUTH = 'badauth';
    public static readonly RETURN_BADAGENT = 'badagent';
    public static readonly RETURN_DONATOR = '!donator';
    public static readonly RETURN_ABUSE = 'abuse';
    public static readonly RETURN_911 = '911';

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

    protected _parseReturn(str: string): NoIpReturn {

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
            const url = NoIp.URL.replace('{auth}', '');

            const response = await got({
                url: url,
                username: options.username,
                password: options.password,
                headers: {
                    'User-Agent': 'Flyingfish Flyingfish/1 https://flying-fish.gitbook.io/flyingfish'
                }
            });

            Logger.getLogger().info(`NoIP::update: http status code: ${response.statusCode}`);

            if (response.statusCode === 200) {
                if (response.body !== '') {
                    const result = this._parseReturn(response.body);
                }
            }
        } catch (e) {
            Logger.getLogger().error(e);
        }

        return tresult;
    }

}