/**
 * NginxStatusResult
 */
export type NginxStatusResult = {
    active: number;
    reading: number;
    writing: number;
    waiting: number;
    accepted: number;
    handled: number;
    handles: number;
};

/**
 * NginxStatus
 */
export class NginxStatus {

    // eslint-disable-next-line require-unicode-regexp
    public static readonly ACTIV_REGEX = /^Active connections:\s+(\d+)/;
    // eslint-disable-next-line require-unicode-regexp
    public static readonly READING_WRITING_REGEX = /^Reading:\s+(\d+).*Writing:\s+(\d+).*Waiting:\s+(\d+)/;
    // eslint-disable-next-line require-unicode-regexp
    public static readonly HANDLED_REGEX = /^\s+(\d+)\s+(\d+)\s+(\d+)/;

    /**
     * parse
     * @param nginxStr
     */
    public static parse(nginxStr: string): NginxStatusResult {
        // eslint-disable-next-line require-unicode-regexp
        const lines = nginxStr.split(/\n/);

        const result: NginxStatusResult = {
            active: 0,
            accepted: 0,
            handled: 0,
            handles: 0,
            reading: 0,
            waiting: 0,
            writing: 0
        };

        lines.forEach((line: string) => {
            let matches;

            if (NginxStatus.ACTIV_REGEX.test(line)) {
                matches = NginxStatus.ACTIV_REGEX.exec(line);

                if (matches) {
                    result.active = parseInt(matches[1], 10);
                }
            } else if (NginxStatus.READING_WRITING_REGEX.test(line)) {
                matches = NginxStatus.READING_WRITING_REGEX.exec(line);

                if (matches) {
                    result.reading = parseInt(matches[1], 10);
                    result.writing = parseInt(matches[2], 10);
                    result.waiting = parseInt(matches[3], 10);
                }
            } else if (NginxStatus.HANDLED_REGEX.test(line)) {
                matches = NginxStatus.HANDLED_REGEX.exec(line);

                if (matches) {
                    result.accepted = parseInt(matches[1], 10);
                    result.handled = parseInt(matches[2], 10);
                    result.handles = parseInt(matches[3], 10);
                }
            }
        });

        return result;
    }

}