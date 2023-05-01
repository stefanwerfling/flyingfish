import fs from 'fs';

/**
 * FileHelper
 */
export class FileHelper {

    /**
     * isOlderHours
     * @param filename
     * @param durationHours
     */
    public static isOlderHours(filename: string, durationHours: number): boolean {
        let stats;

        try {
            stats = fs.statSync(filename);
        } catch (e) {
            return true;
        }

        const fileDate = new Date(stats.mtime);
        const currentDate = new Date();

        return (currentDate.getTime() - fileDate.getTime()) > (durationHours * 60 * 60 * 1000);
    }

}