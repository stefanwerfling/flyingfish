import {spawn} from 'child_process';
import fs from 'fs';
import {Logger} from '../Logger/Logger.js';
import {SimpleProcessAwait} from '../Utils/SimpleProcessAwait.js';

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

        Logger.getLogger().silly(`OpenSSL::createDhparam: "openssl ${args.join(' ')}"`);

        const process = spawn('openssl', args);

        await SimpleProcessAwait.process(process);

        if (fs.existsSync(dhparamfile)) {
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

        Logger.getLogger().silly(`OpenSSL::genRsa: "openssl ${args.join(' ')}"`);

        const process = spawn('openssl', args);

        await SimpleProcessAwait.process(process);

        return fs.existsSync(pemFile);
    }

    /**
     * createCrt
     * @param keyFile
     * @param crtFile
     * @param configFile
     */
    public static async createCrt(keyFile: string, crtFile: string, configFile: string): Promise<boolean> {
        if (fs.existsSync(crtFile)) {
            Logger.getLogger().error(`Crt-File already exist: ${crtFile}`);
            return false;
        }

        if (!fs.existsSync(keyFile)) {
            Logger.getLogger().error(`Key-File not found: ${keyFile}`);
            return false;
        }

        if (!fs.existsSync(configFile)) {
            Logger.getLogger().error(`Config-File not found: ${configFile}`);
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

        Logger.getLogger().silly(`OpenSSL::createCrt: "openssl ${args.join(' ')}"`);

        const process = spawn('openssl', args);

        await SimpleProcessAwait.process(process);

        return fs.existsSync(crtFile);
    }

    /**
     * createCsr
     * @param csrFile
     * @param configFile
     */
    public static async createCsr(csrFile: string, configFile: string): Promise<boolean> {
        if (fs.existsSync(csrFile)) {
            Logger.getLogger().error(`Csr-File already exist: ${csrFile}`);
            return false;
        }

        if (!fs.existsSync(configFile)) {
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

        Logger.getLogger().silly(`OpenSSL::createCsr: "openssl ${args.join(' ')}"`);

        const process = spawn('openssl', args);

        await SimpleProcessAwait.process(process);

        return fs.existsSync(csrFile);
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
        if (fs.existsSync(caFile)) {
            Logger.getLogger().error(`Ca-File already exist: ${caFile}`);
            return false;
        }

        if (!fs.existsSync(csrFile)) {
            Logger.getLogger().error(`Csr-File not found: ${csrFile}`);
            return false;
        }

        if (!fs.existsSync(crtFile)) {
            Logger.getLogger().error(`Crt-File not found: ${crtFile}`);
            return false;
        }

        if (!fs.existsSync(keyFile)) {
            Logger.getLogger().error(`Key-File not found: ${keyFile}`);
            return false;
        }

        if (!fs.existsSync(configFile)) {
            Logger.getLogger().error(`Config-File not found: ${configFile}`);
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

        Logger.getLogger().silly(`OpenSSL::createCa: "openssl ${args.join(' ')}"`);

        const process = spawn('openssl', args);

        await SimpleProcessAwait.process(process);

        return fs.existsSync(caFile);
    }

}