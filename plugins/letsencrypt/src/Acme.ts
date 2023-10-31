import {FSslCertProviderOnReset, ISslCertProvider, SslCertBundel, SslCertCreateOptions} from 'flyingfish_schemas';

/**
 * Lets encrypt Acme object.
 */
export class Acme implements ISslCertProvider {

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

    public async isReadyForRequest(lastRequest: number, tryCount: number, onResetTryCount?: FSslCertProviderOnReset | undefined): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

    public async existCertificate(domainName: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

    public async getCertificationBundel(domainName: string): Promise<SslCertBundel | null> {
        throw new Error('Method not implemented.');
    }
    public async createCertificate(options: SslCertCreateOptions): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

}