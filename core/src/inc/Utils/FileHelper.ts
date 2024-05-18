import {mkdir, stat, unlink, readFile, readdir, lstat} from 'fs/promises';
import {Logger} from '../Logger/Logger.js';

/**
 * FileHelper
 */
export class FileHelper {

    /**
     * isOlderHours
     * @param filename
     * @param durationHours
     */
    public static async isOlderHours(
        filename: string,
        durationHours: number
    ): Promise<boolean> {
        let stats;

        try {
            stats = await stat(filename);
        } catch (e) {
            return true;
        }

        const fileDate = new Date(stats.mtime);
        const currentDate = new Date();

        return (currentDate.getTime() - fileDate.getTime()) > (durationHours * 60 * 60 * 1000);
    }

    /**
     * fileExist
     * @param {string} file
     * @param {boolean} allowLink
     * @returns {boolean}
     */
    public static async fileExist(file: string, allowLink: boolean = false): Promise<boolean> {
        try {
            if( (await stat(file)).isFile()) {
                return true;
            }
        } catch (e) {
            Logger.getLogger().silly(`FileHelper::fileExist: exception by file: ${file}`, e);
        }

        if (allowLink) {
            try {
                if ((await lstat(file)).isSymbolicLink()) {
                    return true;
                }
            } catch (e) {
                Logger.getLogger().silly(`FileHelper::fileExist: exception by file link: ${file}`, e);
            }
        }

        return false;
    }

    /**
     * directoryExist
     * @param director
     */
    public static async directoryExist(director: string): Promise<boolean> {
        try {
            return (await stat(director)).isDirectory();
        } catch (e) {
            return false;
        }
    }

    /**
     * mkdir
     * @param director
     * @param recursive
     */
    public static async mkdir(director: string, recursive: boolean = false): Promise<boolean> {
        try {
            await mkdir(director, {
                recursive: recursive
            });
        } catch (e) {
            return false;
        }

        return true;
    }

    /**
     * Delete a file
     * @param {string} file
     * @returns {boolean}
     */
    public static async deleteFile(file: string): Promise<boolean> {
        try {
            await unlink(file);
        } catch (e) {
            return false;
        }

        return true;
    }

    /**
     * Read the content from File
     * @param {string} file
     * @returns {string}
     */
    public static async readFile(file: string): Promise<string> {
        return readFile(file, 'utf8');
    }

    /**
     * Read a content from File and parse as a json object
     * @param {string} jsonFile
     */
    public static async readJsonFile(jsonFile: string): Promise<any> {
        const raw = await FileHelper.readFile(jsonFile);

        return JSON.parse(raw);
    }

    /**
     * Read a directory
     * @param {string} directory
     * @returns {string[]}
     */
    public static async readdir(directory: string): Promise<string[]> {
        return readdir(directory);
    }

}