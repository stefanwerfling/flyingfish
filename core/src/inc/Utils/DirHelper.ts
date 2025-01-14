import {readdir} from 'fs/promises';

/**
 * Dire helper class
 */
export class DirHelper {

    /**
     * Read a directory
     * @param {string} directory
     * @returns {string[]}
     */
    public static async readdir(directory: string): Promise<string[]> {
        return readdir(directory);
    }

}