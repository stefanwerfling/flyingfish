import {
    ISslCertProvider,
    ProviderType,
    Logger,
    SslCertCreateOptions, FileHelper
} from 'flyingfish_core';
import {ProviderSslEntry} from 'flyingfish_schemas';
import {Certbot} from './Certbot.js';
import {spawn} from 'child_process';

/**
 * LetsEncryptHttp01
 */
export class LetsEncryptHttp01 extends Certbot implements ISslCertProvider {

    public static NAME = 'letsencrypthttp01';
    public static TITLE = 'LetsEncrypt (HTTP-01)';

    /**
     * Return the keyname for provider as ident.
     * @returns {string}
     */
    public getName(): string {
        return LetsEncryptHttp01.NAME;
    }

    /**
     * Return the title for provider (for frontend).
     * @returns {string}
     */
    public getTitle(): string {
        return LetsEncryptHttp01.TITLE;
    }

    /**
     * Return the type of provider
     * @returns {ProviderType}
     */
    public getType(): ProviderType {
        return ProviderType.sslcert;
    }

    /**
     * Return the provider entry
     * @returns {ProviderSslEntry}
     */
    public getProviderEntry(): ProviderSslEntry {
        return {
            name: LetsEncryptHttp01.NAME,
            title: LetsEncryptHttp01.TITLE,
            options: {
                wildcardSupported: this.isSupportWildcard(),
                email_required: true
            }
        };
    }

    /**
     * Support the provider wildcard certificates
     * @returns {boolean}
     */
    public isSupportWildcard(): boolean {
        return false;
    }

    /**
     * Create a certificate by provider.
     * @param {SslCertCreateOptions} options
     * @returns {boolean}
     */
    public async createCertificate(options: SslCertCreateOptions): Promise<boolean> {
        if (!await FileHelper.mkdir(options.webRootPath, true)) {
            Logger.getLogger().error('Web root path can not create/found: %s', options.webRootPath, {
                class: 'Plugin::LetsEncrypt::LetsEncryptHttp01::createCertificate'
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
                class: 'Plugin::LetsEncrypt::LetsEncryptHttp01::createCertificate::process:stdout'
            });
        });

        process.stderr!.on('data', (buf) => {
            Logger.getLogger().error(buf.toString(), {
                class: 'Plugin::LetsEncrypt::LetsEncryptHttp01::createCertificate::process:stderr'
            });
        });

        const returnCode = await new Promise((resolve) => {
            process.on('close', resolve);
        });

        const isCertExist = await this.existCertificate(options.domainName) !== null;

        if (!isCertExist) {
            Logger.getLogger().error('Certification not create/found.', {
                class: 'Plugin::LetsEncrypt::LetsEncryptHttp01::createCertificate'
            });
        }

        let isSuccess = false;

        if (returnCode === 0) {
            isSuccess = true;
        } else {
            Logger.getLogger().error('Return code: $s', returnCode, {
                class: 'Plugin::LetsEncrypt::LetsEncryptHttp01::createCertificate'
            });
        }

        return isCertExist && isSuccess;
    }

}