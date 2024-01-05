import {
    FSslCertProviderOnReset,
    ISslCertProvider,
    SslCertBundel,
    SslCertCreateGlobal,
    SslCertCreateOptions
} from 'flyingfish_schemas';
import {Client} from './Acme/Client.js';

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

    public async createCertificate(options: SslCertCreateOptions, global: SslCertCreateGlobal): Promise<boolean> {
        if(global.dnsServer) {
            const acmeClient = new Client();
            await acmeClient.init();

            const acmeRequest = await acmeClient.requestDnsChallenge(options.domainName);

            if (acmeRequest) {
                const isAdd = global.dnsServer.addTempDomain(acmeRequest.recordName, [{
                    // TXT record
                    type: 0x10,
                    data: acmeRequest.recordText
                }]);

                if (isAdd) {
                    const acmeFinalize = await acmeClient.submitDnsChallengeAndFinalize(acmeRequest.order);

                    if (acmeFinalize) {

                    }

                    // clear tmp domain
                    global.dnsServer.removeTempDomain(acmeRequest.recordName);
                }
            }
        }

        return false;
    }

}