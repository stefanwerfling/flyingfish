import {
    DynDnsClientUpdateStatus,
    DynDnsClientHostsOptions,
    DynDnsClientUpdateOptions,
    DynDnsClientUpdateResult,
    IDynDnsClient,
    Logger
} from 'flyingfish_core';
import got from 'got';

/**
 * NoIP Return
 */
export type NoIpReturn = {
    statusCode: string;
    msg?: string;
    content?: string;
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

    public static readonly RETURN_GOOD_MSG = 'DNS hostname update successful. Followed by a space and the IP address it was updated to.';
    public static readonly RETURN_NOCHG_MSG = 'IP address is current, no update performed. Followed by a space and the IP address that it is currently set to.';
    public static readonly RETURN_NOHOST_MSG = 'Hostname supplied does not exist under specified account, client exit and require user to enter new login credentials before performing an additional request.';
    public static readonly RETURN_BADAUTH_MSG = 'Invalid username password combination.';
    public static readonly RETURN_BADAGENT_MSG = 'Client disabled. Client should exit and not perform any more updates without user intervention.';
    public static readonly RETURN_DONATOR_MSG = 'An update request was sent, including a feature that is not available to that particular user such as offline options.';
    public static readonly RETURN_ABUSE_MSG = 'Username is blocked due to abuse. Either for not following our update specifications or disabled due to violation of the No-IP terms of service. Our terms of service can be viewed here. Client should stop sending updates.';
    public static readonly RETURN_911_MSG = 'A fatal error on our side such as a database outage. Retry the update no sooner than 30 minutes.';

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

    /**
     * Return the msg by status code
     * @param {string} status
     * @returns {string}
     */
    public getStatusMsg(status: string): string {
        switch (status) {
            case NoIp.RETURN_GOOD:
                return NoIp.RETURN_GOOD_MSG;

            case NoIp.RETURN_NOCHG:
                return NoIp.RETURN_NOCHG_MSG;

            case NoIp.RETURN_NOHOST:
                return NoIp.RETURN_NOHOST_MSG;

            case NoIp.RETURN_BADAUTH:
                return NoIp.RETURN_BADAUTH_MSG;

            case NoIp.RETURN_BADAGENT:
                return NoIp.RETURN_BADAGENT_MSG;

            case NoIp.RETURN_DONATOR:
                return NoIp.RETURN_DONATOR_MSG;

            case NoIp.RETURN_ABUSE:
                return NoIp.RETURN_ABUSE_MSG;

            case NoIp.RETURN_911:
                return NoIp.RETURN_911_MSG;
        }

        return 'unknow';
    }

    /**
     * Parse the string from provider
     * @param {string} str
     * @returns {NoIpReturn}
     * @protected
     */
    protected _parseReturn(str: string): NoIpReturn {
        const [status, content] = str.trim().split(' ');
        const statusMsg = this.getStatusMsg(status);

        return {
            msg: statusMsg,
            statusCode: status,
            content: content
        };
    }

    /**
     * Update hostname[s] with the IP
     * @param {DynDnsClientUpdateOptions} options
     * @returns {DynDnsClientUpdateResult}
     */
    public async update(options: DynDnsClientUpdateOptions): Promise<DynDnsClientUpdateResult> {
        const tresult: DynDnsClientUpdateResult = {
            result: false,
            status: DynDnsClientUpdateStatus.ERROR
        };

        if (options.hostname.length === 0) {
            tresult.status = DynDnsClientUpdateStatus.ERROR_OPTIONS;

            return tresult;
        }

        const urlOptionHostname = `?hostname=${options.hostname.join(',')}`;
        let urlOptionMyIp = '';

        if (options.ip !== null) {
            urlOptionMyIp = `${options.ip}`;
        }

        if (options.ip6 !== null) {
            if (urlOptionMyIp !== '') {
                urlOptionMyIp = `${urlOptionMyIp},`;
            }

            urlOptionMyIp = `${urlOptionMyIp}${options.ip6}`;
        }

        if (urlOptionMyIp !== '') {
            urlOptionMyIp = `&myip=${urlOptionMyIp}`;
        }

        try {
            const url = NoIp.URL.replace('{auth}', '');

            const response = await got({
                url: `${url}${urlOptionHostname}${urlOptionMyIp}`,
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

                    console.log(result);

                    if (result.statusCode === NoIp.RETURN_GOOD || result.statusCode === NoIp.RETURN_NOCHG) {
                        tresult.result = true;
                        tresult.status = DynDnsClientUpdateStatus.SUCCESS;
                    }
                }
            }
        } catch (e) {
            Logger.getLogger().error(e);
        }

        return tresult;
    }

}