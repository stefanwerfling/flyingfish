import {spawn} from 'child_process';
import fs from 'fs';

/**
 * TracerouteHop
 */
export type TracerouteHop = {
    hop?: number;
    discovered_addr?: string;
    discovered_hostname?: string;
    delay?: string;
    probe?: string;
    ttl?: string;
};

/**
 * Traceroute
 * http://manpages.ubuntu.com/manpages/trusty/man8/paris-traceroute.8.html
 */
export class Traceroute {

    /**
     * trace
     * @param destination
     * @param notResolve
     */
    public async trace(destination: string, notResolve: boolean = false): Promise<TracerouteHop[]> {
        const cmd = 'paris-traceroute';

        if (!fs.existsSync('/usr/bin/paris-traceroute')) {
            throw new Error('Please install paris traceroute!');
        }

        const args = [];

        if (notResolve) {
            args.push('-n');
        }

        args.push('-w1');
        args.push(destination);

        const traceroute = spawn(cmd, args);

        const hops: TracerouteHop[] = [];

        traceroute.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');

            for (const line of lines) {
                if (line.startsWith('traceroute to')) {
                    continue;
                }

                // eslint-disable-next-line require-unicode-regexp
                const parts = line.trim().replace(/  +/g, ' ').split(' ');

                if (parts.length >= 3) {
                    const hop: TracerouteHop = {};

                    hop.hop = Number.parseInt(parts[0], 10);

                    if (notResolve) {
                        if (parts[1] !== '*') {
                            hop.discovered_addr = parts[1];
                        }
                    } else {
                        if (parts[1] !== '*') {
                            hop.discovered_hostname = parts[1];
                        }

                        if (parts[2] !== '*') {
                            hop.discovered_addr = parts[2].replace('(', '').replace(')', '');
                        }
                    }

                    if (parts.length > 4) {
                        hop.probe = parts[3];
                        hop.delay = parts[4];
                        hop.ttl = parts[5];
                    }

                    hops.push(hop);
                }
            }
        });

        await new Promise((resolve) => {
            traceroute.on('close', resolve);
        });

        return hops;
    }

}