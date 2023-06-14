import {FileHelper} from 'flyingfish_core';
import fs from 'fs/promises';

/**
 * OpenSslCnfMap
 */
interface OpenSslCnfMap {
    [key: string]: string;
}

/**
 * OpenSslCnfSection
 */
interface OpenSslCnfSection {
    [key: string]: OpenSslCnfMap;
}

/**
 * OpenSslCnf
 */
export class OpenSslCnf {

    /**
     * createTmpCnf
     * @param config
     */
    public static async createTmpCnf(config: OpenSslCnfSection): Promise<string | null> {
        const random = Math.random().toString(36).slice(2, 7);
        const filename = `/tmp/${random}.cnf`;

        let buffer = '';

        for (const [key, value] of Object.entries(config)) {
            if (buffer !== '') {
                buffer += '\n';
            }

            buffer += `[${key}]`;

            for (const [skey, svalue] of Object.entries(value)) {
                if (buffer !== '') {
                    buffer += '\n';
                }

                buffer += `${skey} =${svalue}`;
            }
        }

        await fs.writeFile(filename, buffer);

        if (await FileHelper.fileExist(filename)) {
            return filename;
        }

        return null;
    }

}