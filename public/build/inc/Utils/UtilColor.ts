/**
 * UtilColor
 */
export class UtilColor {

    /**
     * getColor
     * @param text
     */
    public static getColor(text: string): string {
        let hash = 0;

        for (let i = 0; i < text.length; i++) {
            // eslint-disable-next-line no-bitwise
            hash = text.charCodeAt(i) + ((hash << 5) - hash);
            // eslint-disable-next-line no-bitwise
            hash &= hash;
        }

        let color = '#';

        for (let i = 0; i < 3; i++) {
            // eslint-disable-next-line no-bitwise
            const value = (hash >> (i * 8)) & 255;

            color += `00${value.toString(16)}`.substr(-2);
        }

        return color;
    }

}