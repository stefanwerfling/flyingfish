/**
 * Small IP Helper object.
 */
export class IPHelper {

    /**
     * Is the given string IP version 4.
     * @param {string} ip
     * @returns {boolean}
     */
    public static isIPv4(ip: string): boolean {
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/u;

        if (ipv4Regex.test(ip)) {
            return ip.split('.').every((part) => parseInt(part, 10) <= 255);
        }

        return false;
    }

    /**
     * Is the given string IP version 6.
     * @param {string} ip
     * @returns {boolean}
     */
    public static isIPv6(ip: string): boolean {
        const ipv6Regex = /^([\da-f]{1,4}:){7}[\da-f]{1,4}$/iu;

        if (ipv6Regex.test(ip)) {
            return ip.split(':').every((part) => part.length <= 4);
        }

        return false;
    }

}