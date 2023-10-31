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
    _publicWwwDirectory = '/opt/app/nginx/html/';
    getName() {
        return 'letsencrypt';
    }
    getTitle() {
        return 'LetsEncrypt (HTTP-01)';
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
        if (!await FileHelper.mkdir(this._publicWwwDirectory, true)) {
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
            this._publicWwwDirectory,
            '-d',
            options.domainName
        ]);
        process.stdout.on('data', (buf) => {
            Logger.getLogger().info(buf.toString());
        });
        process.stderr.on('data', (buf) => {
            Logger.getLogger().error(buf.toString());
        });
        const returnCode = await new Promise((resolve) => {
            process.on('close', resolve);
        });
        const isCertExist = await this.existCertificate(options.domainName) !== null;
        if (!isCertExist) {
            Logger.getLogger().error('Certbot::create: cert not create/found.');
        }
        let isSuccess = false;
        if (returnCode === 0) {
            isSuccess = true;
        }
        else {
            Logger.getLogger().error(`Certbot::create: return code: ${returnCode}`);
        }
        return isCertExist && isSuccess;
    }
}
//# sourceMappingURL=Certbot.js.map