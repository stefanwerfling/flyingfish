import {spawn} from 'child_process';
import {
    FileHelper,
    ISslCertProvider,
    Logger,
    ProviderType,
    SslCertCreateGlobal,
    SslCertCreateOptions
} from 'flyingfish_core';
import {ProviderSslEntry} from 'flyingfish_schemas';
import path from 'path';
import {Certbot} from './Certbot.js';
import {HookServer} from './Dns01/HookServer.js';

/**
 * LetsEncryptDns01
 */
export class LetsEncryptDns01 extends Certbot implements ISslCertProvider {

    public static NAME = 'letsencryptdns01';
    public static TITLE = 'LetsEncrypt (DNS-01)';

    /**
     * Return the keyname for provider as ident.
     * @returns {string}
     */
    public getName(): string {
        return LetsEncryptDns01.NAME;
    }

    /**
     * Return the title for provider (for frontend).
     * @returns {string}
     */
    public getTitle(): string {
        return LetsEncryptDns01.TITLE;
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
            name: LetsEncryptDns01.NAME,
            title: LetsEncryptDns01.TITLE,
            options: {
                email_required: true,
                wildcardSupported: this.isSupportWildcard()
            }
        };
    }

    /**
     * Support the provider wildcard certificates
     * @returns {boolean}
     */
    public isSupportWildcard(): boolean {
        return true;
    }

    /**
     * Create the auth hook script
     * @param {string} unixSocket
     * @protected
     */
    protected async _createHookAuth(unixSocket: string): Promise<string> {
        const pathHook = path.join(this._basePath, 'dns01HookAuth.sh');

        if (await FileHelper.fileExist(pathHook)) {
            await FileHelper.fileDelete(pathHook);
        }

        const content = '#!/bin/bash\n' +
            '\n' +
            `curl -X POST --unix-socket ${unixSocket} "http://localhost/letsencrypt/auth" \\\n` +
            '-H "Content-Type: application/json" \\\n' +
            '-d "{\\"domain\\": \\"$CERTBOT_DOMAIN\\", \\"value\\": \\"$CERTBOT_VALIDATION\\"}"' +
            '\n' +
            'sleep 30';

        await FileHelper.create(pathHook, content);
        await FileHelper.chmod(pathHook, 0o755);

        return pathHook;
    }

    /**
     * Create the clean hook script
     * @param {string} unixSocket
     * @protected
     */
    protected async _createHookCleanup(unixSocket: string): Promise<string> {
        const pathHook = path.join(this._basePath, 'dns01HookCleanup.sh');

        if (await FileHelper.fileExist(pathHook)) {
            await FileHelper.fileDelete(pathHook);
        }

        const content = '#!/bin/bash\n' +
            '\n' +
            `curl -X POST --unix-socket ${unixSocket} "http://localhost/letsencrypt/cleanup" \\\n` +
            '-H "Content-Type: application/json" \\\n' +
            '-d "{\\"domain\\": \\"$CERTBOT_DOMAIN\\"}"' +
            '\n' +
            'sleep 30';

        await FileHelper.create(pathHook, content);
        await FileHelper.chmod(pathHook, 0o755);

        return pathHook;
    }

    /**
     * Create a certificate by provider.
     * https://chattirakeshkumar.medium.com/comprehensive-ssl-certificate-setup-with-lets-encrypt-and-certbot-208403d5e462
     * https://eff-certbot.readthedocs.io/en/stable/using.html#re-creating-and-updating-existing-certificates
     * @param {SslCertCreateOptions} options
     * @param {SslCertCreateGlobal} global
     * @returns {boolean}
     */
    public async createCertificate(options: SslCertCreateOptions, global: SslCertCreateGlobal): Promise<boolean> {
        if (!await FileHelper.mkdir(options.webRootPath, true)) {
            Logger.getLogger().error('Web root path can not create/found: %s', options.webRootPath, {
                class: 'Plugin::LetsEncrypt::LetsEncryptDns01::createCertificate'
            });

            return false;
        }

        // -------------------------------------------------------------------------------------------------------------

        const hookServer = new HookServer(this._basePath, global);
        await hookServer.listen();

        // -------------------------------------------------------------------------------------------------------------

        let keySize = 4096;

        if (options.keySize) {
            keySize = options.keySize;
        }

        const args = [
            'certonly',
            '--manual',
            '--preferred-challenges',
            'dns',
            '--rsa-key-size',
            `${keySize}`,
            '--agree-tos',
            '--no-eff-email',
            '--email',
            options.email,
        ];

        const pathHookAuth = await this._createHookAuth(hookServer.getUnixSocket());
        const pathHookCleanup = await this._createHookCleanup(hookServer.getUnixSocket());

        args.push('--manual-auth-hook', pathHookAuth);
        args.push('--manual-cleanup-hook', pathHookCleanup);

        args.push('-d', options.domainName);

        if (options.wildcard) {
            args.push('-d', `*.${options.domainName}`);
        }

        const process = spawn(this._command, args);

        process.stdout!.on('data', (buf) => {
            Logger.getLogger().info(buf.toString(), {
                class: 'Plugin::LetsEncrypt::LetsEncryptDns01::createCertificate::process:stdout'
            });
        });

        process.stderr!.on('data', (buf) => {
            Logger.getLogger().error(buf.toString(), {
                class: 'Plugin::LetsEncrypt::LetsEncryptDns01::createCertificate::process:stderr'
            });
        });

        const returnCode = await new Promise((resolve) => {
            process.on('close', resolve);
        });

        // -------------------------------------------------------------------------------------------------------------

        hookServer.close();

        // -------------------------------------------------------------------------------------------------------------

        const isCertExist = await this.existCertificate(options.domainName) !== null;

        if (!isCertExist) {
            Logger.getLogger().error('Certification not create/found.', {
                class: 'Plugin::LetsEncrypt::LetsEncryptDns01::createCertificate'
            });
        }

        let isSuccess = false;

        if (returnCode === 0) {
            isSuccess = true;
        } else {
            Logger.getLogger().error('Return code: %s', returnCode, {
                class: 'Plugin::LetsEncrypt::LetsEncryptDns01::createCertificate'
            });
        }

        return isCertExist && isSuccess;
    }

}