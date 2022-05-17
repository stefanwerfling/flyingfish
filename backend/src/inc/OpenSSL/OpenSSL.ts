import {spawn} from 'child_process';
import fs from 'fs';
import {Config} from '../Config/Config';

/**
 * OpenSSL
 */
export class OpenSSL {

    /**
     * createDhparam
     * @param size
     */
    public static async createDhparam(size: number): Promise<string | null> {
        const dhparamfile = OpenSSL.getDhparamFile();
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
        return Config.get()!.openssl!.dhparamfile;
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