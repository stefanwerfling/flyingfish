import {DateHelper, FileHelper, Logger} from 'flyingfish_core';
import {
    FSslCertProviderOnReset,
    ISslCertProvider,
    SslCertBundel,
    SslCertCreateOptions
} from 'flyingfish_schemas';
import path from 'path';
import {spawn} from 'child_process';

/**
 * Lets encrypt certbot object.
 */
export class Certbot implements ISslCertProvider {

    public static readonly LIMIT_REQUESTS = 5;
    public static readonly LIMIT_TIME_HOUR = 1;

    public static readonly PEM_CERT = 'cert.pem';
    public static readonly PEM_CHAIN = 'chain.pem';
    public static readonly PEM_FULLCHAIN = 'fullchain.pem';
    public static readonly PEM_PRIVTKEY = 'privkey.pem';

    /**
     * command
     * @protected
     */
    protected _command: string = 'certbot';

    /**
     * config file
     * @member {string}
     */
    protected _config: string = '/etc/letsencrypt.ini';

    /**
     * Live path from lets encrypt.
     * @member {string}
     */
    protected _livePath: string = '/etc/letsencrypt/live';

    /**
     * Return the keyname for provider as ident.
     * @returns {string}
     */
    public getName(): string {
        return 'letsencrypt';
    }

    /**
     * Return the title for provider (for frontend).
     * @returns {string}
     */
    public getTitle(): string {
        return 'LetsEncrypt (HTTP-01)';
    }

    /**
     * Support the provider wildcard certificates
     * @returns {boolean}
     */
    public isSupportWildcard(): boolean {
        return false;
    }

    /**
     * Is provider ready for the request by last request try.
     * @param {number} lastRequest - Timestamp from last request for creating certificate.
     * @param {number} tryCount - Count by try for creating certificate.
     * @param {FSslCertProviderOnReset} [onResetTryCount] - Function call when reset try counts.
     * @returns {boolean} By true the request can start.
     */
    public async isReadyForRequest(
        lastRequest: number,
        tryCount: number,
        onResetTryCount?: FSslCertProviderOnReset
    ): Promise<boolean> {
        if ((tryCount >= Certbot.LIMIT_REQUESTS) && !DateHelper.isOverAHour(lastRequest, Certbot.LIMIT_TIME_HOUR)) {
            return false;
        } else if ((tryCount >= Certbot.LIMIT_REQUESTS) &&
            DateHelper.isOverAHour(lastRequest, Certbot.LIMIT_TIME_HOUR)) {
            if (onResetTryCount) {
                await onResetTryCount();
            }
        }

        return true;
    }

    /**
     * Build the domain dir path.
     * @param {string} domainName
     * @returns {string}
     */
    protected _getDomainDir(domainName: string): string {
        return path.join(this._livePath, domainName);
    }

    /**
     * Exist a certificate by domain name.
     * @param {string} domainName - Name of domain.
     * @returns {boolean}
     */
    public async existCertificate(domainName: string): Promise<boolean> {
        const domainDir = this._getDomainDir(domainName);

        if (await FileHelper.directoryExist(domainDir)) {
            return FileHelper.fileExist(path.join(domainDir, Certbot.PEM_CERT));
        }

        return false;
    }

    /**
     * Return when existed, the certificat bundel (cert, fullchain, privatkey).
     * @param {string} domainName
     * @returns {SslCertBundel|null}
     */
    public async getCertificationBundel(domainName: string): Promise<SslCertBundel|null> {
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

    /**
     * Create a certificate by provider.
     * @param {SslCertCreateOptions} options
     * @returns {boolean}
     */
    public async createCertificate(options: SslCertCreateOptions): Promise<boolean> {
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

        const process = spawn(this._command,
            [
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

        process.stdout!.on('data', (buf) => {
            Logger.getLogger().info(buf.toString(), {
                class: 'Plugin::LetsEncrypt::Certbot::createCertificate::process:stdout'
            });
        });

        process.stderr!.on('data', (buf) => {
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
        } else {
            Logger.getLogger().error(`Return code: ${returnCode}`, {
                class: 'Plugin::LetsEncrypt::Certbot::createCertificate'
            });
        }

        return isCertExist && isSuccess;
    }

}