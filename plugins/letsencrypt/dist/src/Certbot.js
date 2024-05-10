import { DateHelper, FileHelper, Logger } from 'flyingfish_core';
import path from 'path';
import { spawn } from 'child_process';
export class Certbot {
    static LIMIT_REQUESTS = 5;
    static LIMIT_TIME_HOUR = 1;
    static PEM_CERT = 'cert.pem';
    static PEM_CHAIN = 'chain.pem';
    static PEM_FULLCHAIN = 'fullchain.pem';
    static PEM_PRIVTKEY = 'privkey.pem';
    _command = 'certbot';
    _config = '/etc/letsencrypt.ini';
    _livePath = '/etc/letsencrypt/live';
    getName() {
        return 'letsencrypt';
    }
    getTitle() {
        return 'LetsEncrypt (HTTP-01)';
    }
    isSupportWildcard() {
        return false;
    }
    async isReadyForRequest(lastRequest, tryCount, onResetTryCount) {
        if ((tryCount >= Certbot.LIMIT_REQUESTS) && !DateHelper.isOverAHour(lastRequest, Certbot.LIMIT_TIME_HOUR)) {
            return false;
        }
        else if ((tryCount >= Certbot.LIMIT_REQUESTS) &&
            DateHelper.isOverAHour(lastRequest, Certbot.LIMIT_TIME_HOUR)) {
            if (onResetTryCount) {
                await onResetTryCount();
            }
        }
        return true;
    }
    _getDomainDir(domainName) {
        return path.join(this._livePath, domainName);
    }
    async existCertificate(domainName) {
        const domainDir = this._getDomainDir(domainName);
        if (await FileHelper.directoryExist(domainDir)) {
            return FileHelper.fileExist(path.join(domainDir, Certbot.PEM_CERT));
        }
        return false;
    }
    async getCertificationBundel(domainName) {
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
    async createCertificate(options) {
        if (!await FileHelper.mkdir(options.webRootPath, true)) {
            Logger.getLogger().error(`Web root path can not create/found: ${options.webRootPath}`, {
                class: 'Plugin::LetsEncrypt::Certbot::createCertificate'
            });
            return false;
        }
        let keySize = 4096;
        if (options.keySize) {
            keySize = options.keySize;
        }
        const process = spawn(this._command, [
            'certonly',
            '--non-interactive',
            '--rsa-key-size',
            `${keySize}`,
            '--webroot',
            '--agree-tos',
            '--no-eff-email',
            '--email',
            options.email,
            '-w',
            options.webRootPath,
            '-d',
            options.domainName
        ]);
        process.stdout.on('data', (buf) => {
            Logger.getLogger().info(buf.toString(), {
                class: 'Plugin::LetsEncrypt::Certbot::createCertificate::process:stdout'
            });
        });
        process.stderr.on('data', (buf) => {
            Logger.getLogger().error(buf.toString(), {
                class: 'Plugin::LetsEncrypt::Certbot::createCertificate::process:stderr'
            });
        });
        const returnCode = await new Promise((resolve) => {
            process.on('close', resolve);
        });
        const isCertExist = await this.existCertificate(options.domainName) !== null;
        if (!isCertExist) {
            Logger.getLogger().error('Certification not create/found.', {
                class: 'Plugin::LetsEncrypt::Certbot::createCertificate'
            });
        }
        let isSuccess = false;
        if (returnCode === 0) {
            isSuccess = true;
        }
        else {
            Logger.getLogger().error(`Return code: ${returnCode}`, {
                class: 'Plugin::LetsEncrypt::Certbot::createCertificate'
            });
        }
        return isCertExist && isSuccess;
    }
}
//# sourceMappingURL=Certbot.js.map