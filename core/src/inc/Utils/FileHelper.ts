import {mkdir, stat, unlink} from 'fs/promises';

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

}