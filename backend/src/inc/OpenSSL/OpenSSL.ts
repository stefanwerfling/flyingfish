import {spawn} from 'child_process';
import {FileHelper, Logger, SimpleProcessAwait} from 'flyingfish_core';

/**
 * OpenSSL
 */
export class OpenSSL {

    /**
     * createDhparam
     * @param dhparamfile
     * @param size
     */
    public static async createDhparam(dhparamfile: string, size: number): Promise<string | null> {
        const args = [
            'dhparam',
            '-out',
            dhparamfile,
            `${size}`
        ];

        Logger.getLogger().silly('OpenSSL::createDhparam: "openssl %s"', args.join(' '));

        const process = spawn('openssl', args);

        await SimpleProcessAwait.process(process);

        if (await FileHelper.fileExist(dhparamfile)) {
            return dhparamfile;
        }

        return null;
    }

    /**
     * genRsa
     * @param pemFile
     * @param size
     */
    public static async genRsa(pemFile: string, size: number): Promise<boolean> {
        const args = [
            'genrsa',
            '-out',
            pemFile,
            `${size}`
        ];

        Logger.getLogger().silly('OpenSSL::genRsa: "openssl %s"', args.join(' '));

        const process = spawn('openssl', args);

        await SimpleProcessAwait.process(process);

        return FileHelper.fileExist(pemFile);
    }

    /**
     * createCrt
     * @param keyFile
     * @param crtFile
     * @param configFile
     */
    public static async createCrt(keyFile: string, crtFile: string, configFile: string): Promise<boolean> {
        if (await FileHelper.fileExist(crtFile)) {
            Logger.getLogger().error('Crt-File already exist: %s', crtFile);
            return false;
        }

        if (!await FileHelper.fileExist(keyFile)) {
            Logger.getLogger().error('Key-File not found: %s', keyFile);
            return false;
        }

        if (!await FileHelper.fileExist(configFile)) {
            Logger.getLogger().error('Config-File not found: %s', configFile);
            return false;
        }

        const args = [
            'req',
            '-new',
            '-x509',
            '-key',
            keyFile,
            '-out',
            crtFile,
            '-config',
            configFile
        ];

        Logger.getLogger().silly('OpenSSL::createCrt: "openssl %s"', args.join(' '));

        const process = spawn('openssl', args);

        await SimpleProcessAwait.process(process);

        return FileHelper.fileExist(crtFile);
    }

    /**
     * createCsr
     * @param csrFile
     * @param configFile
     */
    public static async createCsr(csrFile: string, configFile: string): Promise<boolean> {
        if (await FileHelper.fileExist(csrFile)) {
            Logger.getLogger().error(`Csr-File already exist: ${csrFile}`);
            return false;
        }

        if (!await FileHelper.fileExist(configFile)) {
            Logger.getLogger().error(`Config-File not found: ${configFile}`);
            return false;
        }

        const args = [
            'req',
            '-new',
            '-out',
            csrFile,
            '-config',
            configFile
        ];

        Logger.getLogger().silly('OpenSSL::createCsr: "openssl %s"', args.join(' '));

        const process = spawn('openssl', args);

        await SimpleProcessAwait.process(process);

        return FileHelper.fileExist(csrFile);
    }

    /**
     * createCa
     * @param caFile
     * @param csrFile
     * @param crtFile
     * @param keyFile
     * @param configFile
     */
    public static async createCa(caFile: string, csrFile: string, crtFile: string, keyFile: string, configFile: string): Promise<boolean> {
        if (await FileHelper.fileExist(caFile)) {
            Logger.getLogger().error('Ca-File already exist: %s', caFile);
            return false;
        }

        if (!await FileHelper.fileExist(csrFile)) {
            Logger.getLogger().error('Csr-File not found: %s', csrFile);
            return false;
        }

        if (!await FileHelper.fileExist(crtFile)) {
            Logger.getLogger().error('Crt-File not found: %s', crtFile);
            return false;
        }

        if (!await FileHelper.fileExist(keyFile)) {
            Logger.getLogger().error('Key-File not found: %s', keyFile);
            return false;
        }

        if (!await FileHelper.fileExist(configFile)) {
            Logger.getLogger().error('Config-File not found: %s', configFile);
            return false;
        }

        const args = [
            'x509',
            '-req',
            '-in',
            csrFile,
            '-CA',
            crtFile,
            '-CAkey',
            keyFile,
            '-passin',
            'pass:\'\'',
            '-CAcreateserial',
            '-out',
            caFile
        ];

        Logger.getLogger().silly('OpenSSL::createCa: "openssl %s"', args.join(' '));

        const process = spawn('openssl', args);

        await SimpleProcessAwait.process(process);

        return FileHelper.fileExist(caFile);
    }

}