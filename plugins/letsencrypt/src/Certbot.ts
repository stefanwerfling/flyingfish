import {FileHelper, Logger} from 'flyingfish_core';
import {ISslCertProvider, SslCertBundel, SslCertCreateOptions} from 'flyingfish_schemas';
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
     * public www directory
     * @protected
     */
    protected _publicWwwDirectory = '/opt/app/nginx/html/';

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
        return 'LetsEncrypt';
    }

    public isReadyForRequest(
        lastRequest: number,
        tryCounst: number
    ): boolean {
        // TODO
        return false;
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
        if (!await FileHelper.mkdir(this._publicWwwDirectory, true)) {
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
                this._publicWwwDirectory,
                '-d',
                options.domainName
            ]);

        process.stdout!.on('data', (buf) => {
            Logger.getLogger().info(buf.toString());
        });

        process.stderr!.on('data', (buf) => {
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
        } else {
            Logger.getLogger().error(`Certbot::create: return code: ${returnCode}`);
        }

        return isCertExist && isSuccess;
    }

}