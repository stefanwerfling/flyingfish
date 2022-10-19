import {spawn} from 'child_process';
import fs from 'fs';
import {Logger} from '../../Logger/Logger';
import {ISsl} from '../ISsl';

/**
 * Certbot
 */
export class Certbot implements ISsl {

    /**
     * command
     * @protected
     */
    protected _command: string = 'certbot';

    /**
     * config file
     * @protected
     */
    protected _config: string = '/etc/letsencrypt.ini';

    /**
     * getName
     */
    public static getName(): string {
        return 'letsencrypt';
    }

    /**
     * getTitle
     */
    public static getTitle(): string {
        return 'LetsEncrypt';
    }

    /**
     * getName
     */
    public getName(): string {
        return Certbot.getName();
    }

    /**
     * getTitle
     */
    public getTitle(): string {
        return Certbot.getTitle();
    }

    /**
     * create
     * @param domain
     * @param email
     * @param keysize
     */
    public async create(domain: string, email: string, keysize: number = 4096): Promise<boolean> {
        const process = spawn(this._command,
            [
                'certonly',
                '--rsa-key-size',
                `${keysize}`,
                '--webroot',
                '--agree-tos',
                '--no-eff-email',
                '--email',
                email,
                '-w',
                '/opt/app/nginx/html/',
                '-d',
                domain
            ]);

        process.stdout!.on('data', (buf) => {
            Logger.getLogger().info(buf.toString());
        });

        process.stderr!.on('data', (buf) => {
            Logger.getLogger().error(buf.toString());
        });

        await new Promise((resolve) => {
            process.on('close', resolve);
        });

        return Certbot.existCertificate(domain) !== null;
    }

    /**
     * renew
     * @param domain
     */
    public async renew(domain: string): Promise<boolean> {
        const process = spawn(this._command,
            [
                'renew',
                '--non-interactive',
                '--quiet',
                '--disable-hook-validation',
                '-w',
                '/opt/app/nginx/html/',
                '-d',
                domain
            ]);

        process.stdout!.on('data', (buf) => {
            Logger.getLogger().info(buf.toString());
        });

        process.stderr!.on('data', (buf) => {
            Logger.getLogger().error(buf.toString());
        });

        await new Promise((resolve) => {
            process.on('close', resolve);
        });

        return Certbot.existCertificate(domain) !== null;
    }

    /**
     * existCertificate
     * @param domainName
     */
    public static existCertificate(domainName: string): string|null {
        const domainDir = `/etc/letsencrypt/live/${domainName}`;

        if (fs.existsSync(domainDir)) {
            if (fs.existsSync(`${domainDir}/cert.pem`)) {
                return domainDir;
            }
        }

        return null;
    }

}