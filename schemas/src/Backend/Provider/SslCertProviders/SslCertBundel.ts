/**
 * Ssl certification bundel.
 */
export type SslCertBundel = {

    /**
     * Certificate pem path.
     * @member {string}
     */
    certPem: string;

    /**
     * Chain pem path.
     * @member {string}
     */
    chainPem: string;

    /**
     * Full chain pem path.
     * @member {string}
     */
    fullChainPem: string;

    /**
     * Privat key pem path.
     * @member {string}
     */
    privatKeyPem: string;

};