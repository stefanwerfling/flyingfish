import {spawn} from 'child_process';
import {DateHelper, FileHelper, Logger} from 'flyingfish_core';
import {stat, mkdir} from 'fs/promises';
import path from 'path';
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
     * public www directory
     * @protected
     */
    protected _publicWwwDirectory = '/opt/app/nginx/html/';

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
        await mkdir(this._publicWwwDirectory, {
            recursive: true
        });

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
                this._publicWwwDirectory,
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

        const isCertExist = await Certbot.existCertificate(domain) !== null;

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
    public static async existCertificate(domainName: string): Promise<string|null> {
        const domainDir = path.join('/etc/letsencrypt/live', domainName);

        if ((await stat(domainDir)).isDirectory()) {
            if (await FileHelper.fileExist(path.join(domainDir, 'cert.pem'))) {
                return domainDir;
            }
        }

        return null;
    }

}