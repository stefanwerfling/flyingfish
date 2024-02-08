import {Ets} from 'ets';
import {DateHelper, FileHelper, Logger} from 'flyingfish_core';
import {
    FSslCertProviderOnReset,
    ISslCertProvider,
    SslCertBundel, SslCertBundelOptions,
    SslCertCreateGlobal,
    SslCertCreateOptions, SslCertExistOptions
} from 'flyingfish_schemas';
import path from 'path';
import {Client, LetsEncryptDnsChallengeAndFinalize} from './Acme/Client.js';

/**
 * Lets encrypt Acme object.
 */
export class Acme implements ISslCertProvider {

    public static readonly LIMIT_REQUESTS = 5;
    public static readonly LIMIT_TIME_HOUR = 1;

    public static readonly PEM_CERT = 'cert.pem';
    public static readonly PEM_CHAIN = 'chain.pem';
    public static readonly PEM_FULLCHAIN = 'fullchain.pem';
    public static readonly PEM_PRIVTKEY = 'privkey.pem';

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

    /**
     * Build the domain dir path.
     * @param {string} domainName
     * @returns {string}
     */
    protected _getDomainDir(domainName: string): string {
        return path.join(this._livePath, domainName);
    }

    /**
     * Return the filename for cert/key
     * @param {string} fileType
     * @param {boolean} isWildcard
     * @protected
     * @returns {string}
     */
    protected _getFileName(fileType: string, isWildcard: boolean = false): string {
        return `${isWildcard ?? 'wildcard'}.${  fileType}`;
    }

    /**
     * Exist a certificate by domain name.
     * @param {string} domainName - Name of domain.
     * @param {SslCertExistOptions} options - Options for the certificate check is existing
     * @returns {boolean}
     */
    public async existCertificate(domainName: string, options: SslCertExistOptions): Promise<boolean> {
        const domainDir = this._getDomainDir(domainName);

        if (await FileHelper.directoryExist(domainDir)) {
            return FileHelper.fileExist(
                path.join(
                    domainDir,
                    this._getFileName(Acme.PEM_CERT, options.wildcard)
                )
            );
        }

        return false;
    }

    /**
     * Return when existed, the certificat bundel (cert, fullchain, privatkey).
     * @param {string} domainName
     * @param {SslCertBundelOptions} options - Options for the certificate bundel
     * @returns {SslCertBundel|null}
     */
    public async getCertificationBundel(domainName: string, options: SslCertBundelOptions): Promise<SslCertBundel | null> {
        if (await this.existCertificate(domainName, {wildcard: options.wildcard})) {
            const domainDir = this._getDomainDir(domainName);

            return {
                certPem: path.join(domainDir, this._getFileName(Acme.PEM_CERT, options.wildcard)),
                chainPem: path.join(domainDir, this._getFileName(Acme.PEM_CHAIN, options.wildcard)),
                fullChainPem: path.join(domainDir, this._getFileName(Acme.PEM_FULLCHAIN, options.wildcard)),
                privatKeyPem: path.join(domainDir, this._getFileName(Acme.PEM_PRIVTKEY, options.wildcard))
            };
        }

        return null;
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

            if (acmeRequest === null) {
                Logger.getLogger().error(`Acme request faild for domain: ${domainName}`, {
                    class: 'Plugin::LetsEncrypt::Acme::createCertificate'
                });

                return false;
            }

            const newDomain = `${acmeRequest.recordName}.${domainName}`;
            const isAdd = global.dnsServer.addTempDomain(newDomain, [{
                name: acmeRequest.recordName,
                // TXT record
                type: 0x10,
                // IN
                class: 1,
                ttl: 300,
                data: acmeRequest.recordText
            }]);

            if (isAdd) {
                let acmeFinalize: LetsEncryptDnsChallengeAndFinalize|null = null;

                try {
                    acmeFinalize = await acmeClient.submitDnsChallengeAndFinalize(acmeRequest.order);
                } catch (e) {
                    Logger.getLogger().error(Ets.formate(e), {
                        class: 'Plugin::LetsEncrypt::Acme::createCertificate'
                    });
                }

                // clear tmp domain
                global.dnsServer.removeTempDomain(newDomain);

                if (acmeFinalize === null) {
                    Logger.getLogger().error(`Acme callenge finalize request faild for domain: ${domainName}, order: ${acmeRequest.order}`, {
                        class: 'Plugin::LetsEncrypt::Acme::createCertificate'
                    });

                    return false;
                }

                const certPath = this._getDomainDir(options.domainName);

                if (!await FileHelper.mkdir(certPath, true)) {
                    return false;
                }

                Logger.getLogger().silly(`Acme callenge finalize response: ${acmeFinalize.pkcs8Key}`, {
                    class: 'Plugin::LetsEncrypt::Acme::createCertificate'
                });
            }
        } else {
            Logger.getLogger().error('Acme can not use without dnsserver', {
                class: 'Plugin::LetsEncrypt::Acme::createCertificate'
            });
        }

        return false;
    }

}