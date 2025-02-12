import {Ets} from 'ets';
import {mkdir, stat, unlink, readFile, rename, chmod, writeFile, realpath} from 'fs/promises';
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
            Logger.getLogger().silly(e);
            return true;
        }

        const fileDate = new Date(stats.mtime);
        const currentDate = new Date();

        return (currentDate.getTime() - fileDate.getTime()) > (durationHours * 60 * 60 * 1000);
    }

    /**
     * Exist a file
     * @param {string} file
     * @param {boolean} isLink
     * @param {boolean} isSocket
     * @returns {boolean}
     */
    public static async fileExist(file: string, isLink: boolean = false, isSocket: boolean = false): Promise<boolean> {
        let fileStat;

        try {
            fileStat = await stat(file);
        } catch(e) {
            Logger.getLogger().silly('FileHelper::fileExist: exception stat by file: %s', file);
            Logger.getLogger().silly('FileHelper::fileExist: Trace: %s', Ets.formate(e, true, true));
            return false;
        }

        if (fileStat.isFile()) {
            return true;
        }

        if (isLink && fileStat.isSymbolicLink()) {
            return true;
        }

        return isSocket && fileStat.isSocket();
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
            Logger.getLogger().silly(e);
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
            Logger.getLogger().silly(e);
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
            Logger.getLogger().silly(e);
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
            Logger.getLogger().silly(e);
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
            Logger.getLogger().silly(e);
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
     * Read a content from File and parse as a JSON object
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

    /**
     * Create a file with content
     * @param {string} file
     * @param {string} content
     */
    public static async create(file: string, content: string): Promise<void> {
        return writeFile(file, content);
    }

    /**
     * Real path
     * @param {string} apath
     * @returns {string}
     */
    public static async realPath(apath: string): Promise<string> {
        return realpath(apath);
    }

}