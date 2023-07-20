import Path from 'path';
import {CertificateHelper} from '../Crypto/CertificateHelper.js';
import {Logger} from '../Logger/Logger.js';
import {FileHelper} from '../Utils/FileHelper.js';
import {writeFile} from 'fs/promises';

/**
 * CryptHttpHelper
 */
export class CertHttpHelper {

    public static readonly FILE_KEYPEM = 'flyingfish.pem';
    public static readonly FILE_CRT = 'flyingfish.crt';
    public static readonly FILE_CSR = 'flyingfish.csr';
    public static readonly FILE_CA = 'flyingfish.ca';

    /**
     * createExpressCerts
     * @param sslLibPath
     */
    public static async createExpressCerts(sslLibPath: string): Promise<void> {
        if (!await FileHelper.directoryExist(sslLibPath)) {
            FileHelper.mkdir(sslLibPath, true);
        }

        const keyFile = Path.join(sslLibPath, CertHttpHelper.FILE_KEYPEM);

        Logger.getLogger().silly('CertHttpHelper::createExpressCerts: genRsa ...');

        const keyPair = await CertificateHelper.generateKeyPair();

        await writeFile(keyFile, keyPair.private, {
            flag: 'w+'
        });

        if (!await FileHelper.fileExist(keyFile)) {
            Logger.getLogger().silly(`CertHttpHelper::createExpressCerts: cant not wirte keyfile: ${keyFile}`);
            return;
        }

        Logger.getLogger().silly('CertHttpHelper::createExpressCerts: genRsa finish.');
        // TODO
    }

}