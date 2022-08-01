/**
 * OpenSslCnfMap
 */
import fs from 'fs';

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
    public static createTmpCnf(config: OpenSslCnfSection): string|null {
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

        fs.writeFileSync(filename, buffer);

        if (fs.existsSync(filename)) {
            return filename;
        }

        return null;
    }

}