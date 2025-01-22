import {mkdir, stat, unlink, readFile, lstat, rename, chmod, access} from 'fs/promises';
import {constants} from 'fs';
import {Logger} from '../Logger/Logger.js';

/**
 * FileHelper
 */
export class FileHelper {

    /**
     * Is a file older as duration hours?
     * @param {string} filename
     * @param {number} durationHours
     * @returns {boolean}
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
     * Exist a file
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
            Logger.getLogger().silly('FileHelper::fileExist: exception stat by file: %s', file, e);
        }

        try {
            await access(file, constants.F_OK);
            return true;
        } catch (e) {
            Logger.getLogger().silly('FileHelper::fileExist: exception by access ile: %s', file, e);
        }

        if (allowLink) {
            try {
                if ((await lstat(file)).isSymbolicLink()) {
                    return true;
                }
            } catch (e) {
                Logger.getLogger().silly('FileHelper::fileExist: exception by file link: %s', file, e);
            }
        }

        return false;
    }

    /**
     * Exist a directory
     * @param {string} director
     * @returns {boolean}
     */
    public static async directoryExist(director: string): Promise<boolean> {
        try {
            return (await stat(director)).isDirectory();
        } catch (e) {
            return false;
        }
    }

    /**
     * Create a directory
     * @param {string} director
     * @param {boolean} recursive
     * @returns {boolean}
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
     * Return the file size
     * @param {string} file
     * @returns {number}
     */
    public static async fileSize(file: string): Promise<number> {
        try {
            return (await stat(file)).size;
        } catch (e) {
            return -1;
        }
    }

    /**
     * File rename
     * @param {string} filePath
     * @param {string} targetPath
     * @returns {boolean}
     */
    public static async fileRename(filePath: string, targetPath: string): Promise<boolean> {
        try {
            await rename(filePath, targetPath);
        } catch (e) {
            return false;
        }

        return true;
    }

    /**
     * File delete
     * @param {string} file
     * @returns {boolean}
     */
    public static async fileDelete(file: string): Promise<boolean> {
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
     * Chmod a path
     * @param {string} apath
     * @param {number|string} mode
     */
    public static async chmod(apath: string, mode: string|number): Promise<void> {
        return chmod(apath, mode);
    }

}