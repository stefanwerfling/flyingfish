/**
 * BasicAuthData
 */
export type BasicAuthData = {
    scheme: string;
    username: string;
    password: string;
};

/**
 * BasicAuthParser
 */
export class BasicAuthParser {

    /**
     * parse
     * @param header
     */
    public static parse(header: string): BasicAuthData|null {
        const parts = header.split(' ');

        if (parts.length >= 2) {
            const decoded = Buffer.from(parts[1], 'base64').toString('utf8');
            const colon = decoded.indexOf(':');

            if (colon > -1) {
                // TODO debug this!
                return {
                    scheme: parts[0],
                    username: decoded.substring(0, colon),
                    password: decoded.substring(colon + 1)
                };
            }
        }

        return null;
    }

}