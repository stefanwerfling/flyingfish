import {spawn} from 'child_process';
import {CertificateHelper, CertificateHelperKeyType, FileHelper, Logger} from 'flyingfish_core';
import fs from 'fs/promises';

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

        return FileHelper.fileExist(file);
    }

    /**
     * create2
     * @param file
     * @param passphrase
     * @param crypt
     */
    public static async create2(
        file: string,
        passphrase: string = '',
        crypt: SshKeygenCrypt = SshKeygenCrypt.rsa
    ): Promise<boolean> {
        const keys = await CertificateHelper.generateSshKeyPair(
            4096,
            crypt === SshKeygenCrypt.rsa ? CertificateHelperKeyType.rsa : CertificateHelperKeyType.dsa,
            passphrase
        );

        try {
            await fs.writeFile(file, keys.private);
        } catch (err) {
            Logger.getLogger().error('SshKeygen::create2: ssh key file can not create!');
            return false;
        }

        return FileHelper.fileExist(file);
    }

}