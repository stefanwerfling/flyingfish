import {Logger} from 'flyingfish_core';
import got from 'got';
import {IDynDns, IDynDnsUpdate} from '../IDynDns.js';

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
export class Selfhost implements IDynDns {

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
     * _parseReturn
     * @param str
     * @protected
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
     * getStatusMsg
     * @param status
     */
    public getStatusMsg(status: number): string {
        if (Selfhost.STATUS[status]) {
            return Selfhost.STATUS[status];
        }

        return 'unknow';
    }

    /**
     * update
     * @param username
     * @param password
     * @param ip
     */
    public async update(username: string, password: string, ip: string = ''): Promise<IDynDnsUpdate> {
        const tresult: IDynDnsUpdate = {
            result: false,
            status: 0
        };

        try {
            let myip = '';

            if (ip !== '') {
                myip = `&myip=${ip}`;
            }

            const response = await got({
                url: `${Selfhost.URL}username=${username}&password=${password}${myip}`
            });

            Logger.getLogger().info(`Selfhost::update: http status code: ${response.statusCode}`);

            if (response.statusCode === 200) {
                if (response.body !== '') {
                    const result = this._parseReturn(response.body);

                    tresult.status = result.statusCode;

                    if (result.statusCode === 200 || result.statusCode === 204) {
                        tresult.result = true;
                    }

                    Logger.getLogger().error(`Selfhost::update: status code: ${result.statusCode}`);
                    Logger.getLogger().error(`Selfhost::update: status code-msg: ${this.getStatusMsg(result.statusCode)}`);

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
     * getHosts
     * @param username
     * @param password
     */
    public async getHosts(username: string, password: string): Promise<string[]> {
        const list: string[] = [];

        try {
            const response = await got({
                url: `${Selfhost.URL}username=${username}&password=${password}&hostlist=1`
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