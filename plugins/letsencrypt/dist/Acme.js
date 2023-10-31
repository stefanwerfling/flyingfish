export class Acme {
    getName() {
        return 'letsencrypt_dns01';
    }
    getTitle() {
        return 'LetsEncrypt (DNS-01)';
    }
    async isReadyForRequest(lastRequest, tryCount, onResetTryCount) {
        throw new Error('Method not implemented.');
    }
    async existCertificate(domainName) {
        throw new Error('Method not implemented.');
    }
    async getCertificationBundel(domainName) {
        throw new Error('Method not implemented.');
    }
    async createCertificate(options) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=Acme.js.map