import {FSslCertProviderOnReset} from './FSslCertProviderOnReset.js';
import {SslCertBundel} from './SslCertBundel.js';
import {SslCertCreateGlobal} from './SslCertCreateGlobal.js';
import {SslCertCreateOptions} from './SslCertCreateOptions.js';

/**
 * The ssl certificate provider interface.
 */
export interface ISslCertProvider {

    /**
     * Return the keyname for provider as ident.
     * @returns {string}
     */
    getName(): string;

    /**
     * Return the title for provider (for frontend).
     * @returns {string}
     */
    getTitle(): string;

    /**
     * Support the provider wildcard certificates
     * @returns {boolean}
     */
    isSupportWildcard(): boolean;

    /**
     * Is provider ready for the request by last request try.
     * @param {number} lastRequest - Timestamp from last request for creating certificate.
     * @param {number} tryCount - Count by try for creating certificate.
     * @param {FSslCertProviderOnReset} [onResetTryCount] - Function call when reset try counts.
     * @returns {boolean} By true the request can start.
     */
    isReadyForRequest(
        lastRequest: number,
        tryCount: number,
        onResetTryCount?: FSslCertProviderOnReset
    ): Promise<boolean>;

    /**
     * Exist a certificate by domain name.
     * @param {string} domainName - Name of domain.
     * @returns {boolean}
     */
    existCertificate(domainName: string): Promise<boolean>;

    /**
     * Return when existed, the certificat bundel (cert, fullchain, privatkey).
     * @param {string} domainName
     * @returns {SslCertBundel|null}
     */
    getCertificationBundel(domainName: string): Promise<SslCertBundel|null>;

    /**
     * Create a certificate by provider.
     * @param {SslCertCreateOptions} options
     * @param {SslCertCreateGlobal} global
     * @returns {boolean}
     */
    createCertificate(options: SslCertCreateOptions, global: SslCertCreateGlobal): Promise<boolean>;

}