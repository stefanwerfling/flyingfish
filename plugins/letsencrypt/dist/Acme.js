import { Ets } from 'ets';
import { DateHelper, FileHelper, Logger } from 'flyingfish_core';
import path from 'path';
import { Client } from './Acme/Client.js';
export class Acme {
    static LIMIT_REQUESTS = 5;
    static LIMIT_TIME_HOUR = 1;
    static PEM_CERT = 'cert.pem';
    static PEM_CHAIN = 'chain.pem';
    static PEM_FULLCHAIN = 'fullchain.pem';
    static PEM_PRIVTKEY = 'privkey.pem';
    _livePath = '/etc/letsencrypt/live';
    getName() {
        return 'letsencrypt_dns01';
    }
    getTitle() {
        return 'LetsEncrypt (DNS-01)';
    }
    isSupportWildcard() {
        return true;
    }
    async isReadyForRequest(lastRequest, tryCount, onResetTryCount) {
        if ((tryCount >= Acme.LIMIT_REQUESTS) && !DateHelper.isOverAHour(lastRequest, Acme.LIMIT_TIME_HOUR)) {
            return false;
        }
        else if ((tryCount >= Acme.LIMIT_REQUESTS) &&
            DateHelper.isOverAHour(lastRequest, Acme.LIMIT_TIME_HOUR)) {
            if (onResetTryCount) {
                await onResetTryCount();
            }
        }
        return true;
    }
    _getDomainDir(domainName) {
        return path.join(this._livePath, domainName);
    }
    _getFileName(fileType, isWildcard = false) {
        return `${isWildcard ?? 'wildcard'}.${fileType}`;
    }
    async existCertificate(domainName, options) {
        const domainDir = this._getDomainDir(domainName);
        if (await FileHelper.directoryExist(domainDir)) {
            return FileHelper.fileExist(path.join(domainDir, this._getFileName(Acme.PEM_CERT, options.wildcard)));
        }
        return false;
    }
    async getCertificationBundel(domainName, options) {
        if (await this.existCertificate(domainName, { wildcard: options.wildcard })) {
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
    async createCertificate(options, global) {
        if (global.dnsServer) {
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
                    type: 0x10,
                    class: 1,
                    ttl: 300,
                    data: acmeRequest.recordText
                }]);
            if (isAdd) {
                let acmeFinalize = null;
                try {
                    acmeFinalize = await acmeClient.submitDnsChallengeAndFinalize(acmeRequest.order);
                }
                catch (e) {
                    Logger.getLogger().error(Ets.formate(e), {
                        class: 'Plugin::LetsEncrypt::Acme::createCertificate'
                    });
                }
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
        }
        else {
            Logger.getLogger().error('Acme can not use without dnsserver', {
                class: 'Plugin::LetsEncrypt::Acme::createCertificate'
            });
        }
        return false;
    }
}
//# sourceMappingURL=Acme.js.map