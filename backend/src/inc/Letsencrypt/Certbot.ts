import {spawn} from 'child_process';
import fs from 'fs';
import {Logger} from '../Logger/Logger';

/**
 * Certbot
 */
export class Certbot {

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
     * domain
     * @param domain
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

        return false;
    }

    /**
     * existCertificate
     * @param domainName
     */
    public static existCertificate(domainName: string): string|null {
        const domainDir = `/etc/letsencrypt/live/${domainName}`;

        if (fs.existsSync(domainDir)) {
            if (fs.existsSync(`${domainDir}/privkey.pem`)) {
                return domainDir;
            }
        }

        return null;
    }

}