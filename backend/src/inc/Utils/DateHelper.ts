/**
 * DateHelper
 */
export class DateHelper {

    /**
     * getCurrentDbTime
     */
    public static getCurrentDbTime(): number {
        const tdate = new Date();
        return tdate.getTime() / 1000;
    }

}