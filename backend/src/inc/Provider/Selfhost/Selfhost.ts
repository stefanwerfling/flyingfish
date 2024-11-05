import {
    DynDnsClientHostsOptions,
    DynDnsClientUpdateOptions,
    DynDnsClientUpdateResult,
    IDynDnsClient,
    Logger
} from 'flyingfish_core';
import got from 'got';

/**
 * SelfhostStatusMap
 */
export interface SelfhostStatusMap {
    [key: number]: string;
}

/**
 * SelfhostReturn
 */
export type SelfhostReturn = {
    statusCode: number;
    msg?: string;
    hosts?: string[];
    remotes?: string[];
};

/**
 * Selfhost
 * @see https://selfhost.de/cgi-bin/selfhost?p=document&name=api
 */
export class Selfhost implements IDynDnsClient {

    /**
     * consts
     */
    public static readonly URL = 'https://carol.selfhost.de/update?';
    public static readonly RETURN_STATUS = 'status';
    public static readonly RETURN_TEXT = 'text';
    public static readonly RETURN_HOSTNAME = 'hostname';
    public static readonly RETURN_HOSTLIST = 'hostlist';
    public static readonly RETURN_REMOTE = 'remote';
    public static readonly RETURN_UPDATEIP = 'updateip';

    /**
     * Status
     */
    public static readonly STATUS: SelfhostStatusMap = {
        200: 'ok',
        204: 'No Content (IP not changed)',
        401: 'Unauthorized (Account closed)',
        409: 'Conflict (No Zones found)',
        410: 'Gone (Account inaktiv)',
        411: 'IP incorrect',
        412: 'Private IP addresses cannot be routed',
        503: 'Overloaded (Update time too briefly or Server closing)'
    };

    /**
     * Static Name
     */
    public static getName(): string {
        return 'selfhost';
    }

    /**
     * Static Title
     */
    public static getTitle(): string {
        return 'SelfHost';
    }

    /**
     * Get the name of client
     * @returns {string}
     */
    public getName(): string {
        return Selfhost.getName();
    }

    /**
     * Get the title of title
     * @returns {string}
     */
    public getTitle(): string {
        return Selfhost.getTitle();
    }

    /**
     * Parse the return from server
     * @param {string} str
     * @returns {SelfhostReturn}
     */
    protected _parseReturn(str: string): SelfhostReturn {
        const lines = str.split('\n');
        const result: SelfhostReturn = {
            statusCode: 0
        };

        for (const line of lines) {
            const parts = line.split('=');

            if (parts.length >= 2) {
                const key = parts[0].toLowerCase();

                switch (key) {
                    case Selfhost.RETURN_STATUS:
                        result.statusCode = parseInt(parts[1].toLowerCase(), 10) || 0;
                        break;

                    case Selfhost.RETURN_TEXT:
                        result.msg = parts[1];
                        break;

                    case Selfhost.RETURN_HOSTLIST:
                        result.hosts = parts[1].split(' ');
                        break;

                    case Selfhost.RETURN_REMOTE:
                        result.remotes = parts[1].split(' ');
                        break;
                }
            }
        }

        return result;
    }

    /**
     * Return the Msg status
     * @param {string} status
     * @returns {string}
     */
    public getStatusMsg(status: string): string {
        const nstatus = parseInt(status, 10) || 0;

        if (Selfhost.STATUS[nstatus]) {
            return Selfhost.STATUS[nstatus];
        }

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
            let myip = '';

            if (options.ip !== null) {
                myip = `&myip=${options.ip}`;
            }

            if (options.ip6 !== null) {
                myip = `&myip=${options.ip6}`;
            }

            const response = await got({
                url: `${Selfhost.URL}username=${options.username}&password=${options.password}${myip}`
            });

            Logger.getLogger().info(`Selfhost::update: http status code: ${response.statusCode}`);

            if (response.statusCode === 200) {
                if (response.body !== '') {
                    const result = this._parseReturn(response.body);

                    tresult.status = result.statusCode;

                    if (result.statusCode === 200 || result.statusCode === 204) {
                        tresult.result = true;
                    }

                    const statusMsg = this.getStatusMsg(`${result.statusCode}`);

                    Logger.getLogger().error(`Selfhost::update: status code: ${result.statusCode}`);
                    Logger.getLogger().error(`Selfhost::update: status code-msg: ${statusMsg}`);

                    if (result.msg) {
                        Logger.getLogger().error(`Selfhost::update: msg by selfhost: ${result.msg}`);
                    }
                }
            }
        } catch (e) {
            Logger.getLogger().error(e);
        }

        return tresult;
    }

    /**
     * Return all supported hostnames
     * @param {DynDnsClientHostsOptions} options
     * @returns {string[]}
     */
    public async getHosts(options: DynDnsClientHostsOptions): Promise<string[]> {
        const list: string[] = [];

        try {
            const response = await got({
                url: `${Selfhost.URL}username=${options.username}&password=${options.password}&hostlist=1`
            });

            if (response.statusCode === 200) {
                if (response.body !== '') {
                    const result = this._parseReturn(response.body);

                    if (result.hosts) {
                        for (const aHost of result.hosts) {
                            list.push(aHost);
                        }
                    }
                }
            }
        } catch (e) {
            Logger.getLogger().error(e);
        }

        return list;
    }

}