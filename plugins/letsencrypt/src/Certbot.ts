import {
    DateHelper,
    FileHelper,
    FSslCertProviderOnReset,
    SslCertBundel
} from 'flyingfish_core';
import path from 'path';

/**
 * Lets encrypt certbot object.
 */
export class Certbot {

    public static readonly LIMIT_REQUESTS = 5;
    public static readonly LIMIT_TIME_HOUR = 1;

    public static readonly PEM_CERT = 'cert.pem';
    public static readonly PEM_CHAIN = 'chain.pem';
    public static readonly PEM_FULLCHAIN = 'fullchain.pem';
    public static readonly PEM_PRIVTKEY = 'privkey.pem';

    /**
     * command
     * @protected
     */
    protected _command: string = 'certbot';

    /**
     * config file
     * @member {string}
     */
    protected _config: string = '/etc/letsencrypt.ini';

    /**
     * Base Path
     * @protected
     */
    protected _basePath: string = '/etc/letsencrypt';

    /**
     * Live path from lets encrypt.
     * @member {string}
     */
    protected _livePath: string = '/live';

    /**
     * Build the domain dir path.
     * @param {string} domainName
     * @returns {string}
     */
    protected _getDomainDir(domainName: string): string {
        return path.join(this._basePath, this._livePath, domainName);
    }

    /**
     * Exist a certificate by domain name.
     * @param {string} domainName - Name of domain.
     * @returns {boolean}
     */
    public async existCertificate(domainName: string): Promise<boolean> {
        const domainDir = this._getDomainDir(domainName);

        if (await FileHelper.directoryExist(domainDir)) {
            return FileHelper.fileExist(path.join(domainDir, Certbot.PEM_CERT));
        }

        return false;
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
        if ((tryCount >= Certbot.LIMIT_REQUESTS) && !DateHelper.isOverAHour(lastRequest, Certbot.LIMIT_TIME_HOUR)) {
            return false;
        } else if ((tryCount >= Certbot.LIMIT_REQUESTS) &&
            DateHelper.isOverAHour(lastRequest, Certbot.LIMIT_TIME_HOUR)) {
            if (onResetTryCount) {
                await onResetTryCount();
            }
        }

        return true;
    }

    /**
     * Return when existed, the certificat bundel (cert, fullchain, privatkey).
     * @param {string} domainName
     * @returns {SslCertBundel|null}
     */
    public async getCertificationBundel(domainName: string): Promise<SslCertBundel|null> {
        if (await this.existCertificate(domainName)) {
            const domainDir = this._getDomainDir(domainName);

            return {
                certPem: path.join(domainDir, Certbot.PEM_CERT),
                chainPem: path.join(domainDir, Certbot.PEM_CHAIN),
                fullChainPem: path.join(domainDir, Certbot.PEM_FULLCHAIN),
                privatKeyPem: path.join(domainDir, Certbot.PEM_PRIVTKEY)
            };
        }

        return null;
    }

}