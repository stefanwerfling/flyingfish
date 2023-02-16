/**
 * UtilNumber
 */
export class UtilNumber {

    /**
     * getNumber
     * @param value
     * @param defaultValue
     */
    public static getNumber(value: string, defaultValue: number = 0): number {
        const num = parseInt(value, 10);

        return isNaN(num) ? defaultValue : num;
    }

}