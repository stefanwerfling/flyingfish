/**
 * Ssl certification creates options.
 */
export type SslCertCreateOptions = {

    /**
     * The domain name for certificate creation.
     * @member {string}
     */
    domainName: string;

    /**
     * The email for certificate notification from provider.
     * @member {string}
     */
    email: string;

    /**
     * Size of a private key, by undefinded is the default 4096.
     * @member {number}
     */
    keySize?: number;

};