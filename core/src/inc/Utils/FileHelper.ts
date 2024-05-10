import {mkdir, stat, unlink, readFile, readdir} from 'fs/promises';

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
     * @param file
     */
    public static async fileExist(file: string): Promise<boolean> {
        try {
            return (await stat(file)).isFile();
        } catch (e) {
            return false;
        }
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