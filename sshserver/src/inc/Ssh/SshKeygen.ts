import {spawn} from 'child_process';
import {Logger} from 'flyingfish_core';
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
     * @param passphrase
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
            Logger.getLogger().info(buf.toString());
        });

        process.stderr!.on('data', (buf) => {
            Logger.getLogger().error(buf.toString());
        });

        await new Promise((resolve) => {
            process.on('close', resolve);
        });

        return fs.existsSync(file);
    }

}