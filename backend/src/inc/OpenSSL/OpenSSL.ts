import {spawn} from 'child_process';
import fs from 'fs';

/**
 * OpenSSL
 */
export class OpenSSL {

    /**
     * createDhparam
     * @param size
     */
    public static async createDhparam(size: number): Promise<string | null> {
        const dhparamfile = '/opt/app/nginx/dhparam.pem';
        const process = spawn('openssl',
            [
                'dhparam',
                '-out',
                dhparamfile,
                `${size}`
            ]);

        process.stdout!.on('data', (buf) => {
            console.log(buf.toString());
        });

        process.stderr!.on('data', (buf) => {
            console.log(buf.toString());
        });

        await new Promise((resolve) => {
            process.on('close', resolve);
        });

        if (OpenSSL.existDhparam()) {
            return dhparamfile;
        }

        return null;
    }

    /**
     * getDhparamFile
     */
    public static getDhparamFile(): string {
        return '/opt/app/nginx/dhparam.pem';
    }

    /**
     * existDhparam
     */
    public static existDhparam(): boolean {
        const dhparamfile = OpenSSL.getDhparamFile();

        if (fs.existsSync(dhparamfile)) {
            return true;
        }

        return false;
    }

}