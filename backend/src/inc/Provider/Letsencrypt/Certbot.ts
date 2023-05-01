import {spawn} from 'child_process';
import {DateHelper, Logger} from 'flyingfish_core';
import fs from 'fs';
import {ISsl} from '../ISsl.js';

/**
 * Certbot
 */
export class Certbot implements ISsl {

    public static readonly LIMIT_REQUESTS = 5;
    public static readonly LIMIT_TIME_HOUR = 1;

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
                '--non-interactive',
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

        const reutnCode = await new Promise((resolve) => {
            process.on('close', resolve);
        });

        const isCertExist = Certbot.existCertificate(domain) !== null;

        if (!isCertExist) {
            Logger.getLogger().error('Certbot::create: cert not create/found.');
        }

        let isSuccess = false;

        if (reutnCode === 0) {
            isSuccess = true;
        } else {
            Logger.getLogger().error(`Certbot::create: return code: ${reutnCode}`);
        }

        return isCertExist && isSuccess;
    }

    /**
     * isOverLimit
     * @param trycount
     * @param lastrequstTime
     */
    public isOverLimit(trycount: number, lastrequstTime: number): boolean {
        return (trycount >= Certbot.LIMIT_REQUESTS) && !DateHelper.isOverAHour(lastrequstTime, Certbot.LIMIT_TIME_HOUR);
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