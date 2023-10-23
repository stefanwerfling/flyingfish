import {SslCertBundel} from './SslCertBundel.js';
import {SslCertCreateOptions} from "./SslCertCreateOptions.js";

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
     * Is provider ready for the request by last request try.
     * @param {number} lastRequest - Timestamp from last request.
     * @param {number} tryCounst - Count by trys.
     * @returns {boolean} By true the request can start.
     */
    isReadyForRequest(lastRequest: number, tryCounst: number): boolean;

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
     * @returns {boolean}
     */
    createCertificate(options: SslCertCreateOptions): Promise<boolean>;

}