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

    /**
     * isOverAHour
     * @param checkTime
     * @param hours
     */
    public static isOverAHour(checkTime: number, hours: number = 1): boolean {
        const diffTime = DateHelper.getCurrentDbTime() - checkTime;
        const secHours = hours * 60 * 60;

        return diffTime > secHours;
    }

}