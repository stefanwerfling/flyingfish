import {DateHelper, FileHelper} from 'flyingfish_core';
import {
    FSslCertProviderOnReset,
    ISslCertProvider,
    SslCertBundel,
    SslCertCreateGlobal,
    SslCertCreateOptions
} from 'flyingfish_schemas';
import path from 'path';
import {Client} from './Acme/Client.js';

/**
 * Lets encrypt Acme object.
 */
export class Acme implements ISslCertProvider {

    public static readonly LIMIT_REQUESTS = 5;
    public static readonly LIMIT_TIME_HOUR = 1;

    /**
     * Live path from lets encrypt.
     * @member {string}
     */
    protected _livePath: string = '/etc/letsencrypt/live';

    /**
     * Return the keyname for provider as ident.
     * @returns {string}
     */
    public getName(): string {
        return 'letsencrypt_dns01';
    }

    /**
     * Return the title for provider (for frontend).
     * @returns {string}
     */
    public getTitle(): string {
        return 'LetsEncrypt (DNS-01)';
    }

    /**
     * Support the provider wildcard certificates
     * @returns {boolean}
     */
    public isSupportWildcard(): boolean {
        return true;
    }

    /**
     * Is provider ready for the request by last request try.
     * @param {number} lastRequest - Timestamp from last request for creating certificate.
     * @param {number} tryCount - Count by try for creating certificate.
     * @param {FSslCertProviderOnReset} [onResetTryCount] - Function call when reset try counts.
     * @returns {boolean} By true the request can start.
     */
    public async isReadyForRequest(
        lastRequest: number,
        tryCount: number,
        onResetTryCount?: FSslCertProviderOnReset
    ): Promise<boolean> {
        if ((tryCount >= Acme.LIMIT_REQUESTS) && !DateHelper.isOverAHour(lastRequest, Acme.LIMIT_TIME_HOUR)) {
            return false;
        } else if ((tryCount >= Acme.LIMIT_REQUESTS) &&
            DateHelper.isOverAHour(lastRequest, Acme.LIMIT_TIME_HOUR)) {
            if (onResetTryCount) {
                await onResetTryCount();
            }
        }

        return true;
    }

    public async existCertificate(domainName: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

    public async getCertificationBundel(domainName: string): Promise<SslCertBundel | null> {
        throw new Error('Method not implemented.');
    }

    /**
     * Create a certificate by provider.
     * @param {SslCertCreateOptions} options
     * @param {SslCertCreateGlobal} global
     * @returns {boolean}
     */
    public async createCertificate(options: SslCertCreateOptions, global: SslCertCreateGlobal): Promise<boolean> {
        if(global.dnsServer) {
            const acmeClient = new Client({
                keysize: options.keySize
            });

            await acmeClient.init();

            let domainName = options.domainName;

            if (options.wildcard) {
                domainName = `*.${options.domainName}`;
            }

            const acmeRequest = await acmeClient.requestDnsChallenge(domainName);

            if (acmeRequest) {
                const isAdd = global.dnsServer.addTempDomain(acmeRequest.recordName, [{
                    name: acmeRequest.recordName,
                    // TXT record
                    type: 0x10,
                    // IN
                    class: 1,
                    ttl: 300,
                    data: acmeRequest.recordText
                }]);

                if (isAdd) {
                    const acmeFinalize = await acmeClient.submitDnsChallengeAndFinalize(acmeRequest.order);

                    // clear tmp domain
                    global.dnsServer.removeTempDomain(acmeRequest.recordName);

                    if (acmeFinalize) {
                        const certPath = path.join(this._livePath, options.domainName);

                        if (!await FileHelper.mkdir(certPath, true)) {
                            return false;
                        }

                    }
                }
            }
        }

        return false;
    }

}