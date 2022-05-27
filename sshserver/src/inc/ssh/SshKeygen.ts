import {spawn} from 'child_process';
import fs from 'fs';

/**
 * SshKeygenCrypt
 */
export enum SshKeygenCrypt {
    rsa = 'rsa',
    dsa = 'dsa'
}

/**
 * SshKeygen
 */
export class SshKeygen {

    /**
     * create
     * @param file
     * @param crypt
     */
    public static async create(file: string, passphrase: string = '', crypt: SshKeygenCrypt = SshKeygenCrypt.rsa): Promise<boolean> {
        const process = spawn('ssh-keygen', [
            '-f',
            file,
            '-N',
            passphrase,
            '-t',
            crypt
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

        if (fs.existsSync(file)) {
            return true;
        }

        return false;
    }

}