/**
 * IPv4/IPv6 CIDR membership (Pi-router epic, Phase 5): used to gate the dnsserver's
 * caching resolver to INTERNAL (LAN) source addresses only — it must never be an open
 * resolver. Pure, dependency-free (no bitwise ops — plain integer math).
 */

/**
 * Parse a dotted IPv4 to 4 bytes, or null.
 * @param ip - the IPv4 address
 */
const ipv4ToBytes = (ip: string): number[] | null => {
    const octets = ip.split('.');

    if (octets.length !== 4) {
        return null;
    }

    const bytes: number[] = [];

    for (const octet of octets) {
        if (!/^\d{1,3}$/u.test(octet)) {
            return null;
        }

        const value = Number(octet);

        if (value > 255) {
            return null;
        }

        bytes.push(value);
    }

    return bytes;
};

/**
 * Parse an IPv6 (with an optional single `::` and optional trailing IPv4) to 16 bytes,
 * or null.
 * @param ip - the IPv6 address
 */
const ipv6ToBytes = (ip: string): number[] | null => {
    const halves = ip.split('::');

    if (halves.length > 2) {
        return null;
    }

    const expand = (part: string): number[] | null => {
        if (part === '') {
            return [];
        }

        const groups = part.split(':');
        const bytes: number[] = [];

        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];

            // A trailing IPv4 in the last group (e.g. ::ffff:1.2.3.4).
            if (group.includes('.') && i === groups.length - 1) {
                const v4 = ipv4ToBytes(group);

                if (v4 === null) {
                    return null;
                }

                bytes.push(...v4);
                continue;
            }

            if (!/^[0-9a-fA-F]{1,4}$/u.test(group)) {
                return null;
            }

            const value = parseInt(group, 16);
            bytes.push(Math.floor(value / 256), value % 256);
        }

        return bytes;
    };

    const head = expand(halves[0]);
    const tail = halves.length === 2 ? expand(halves[1]) : [];

    if (head === null || tail === null) {
        return null;
    }

    if (halves.length === 2) {
        const fill = 16 - head.length - tail.length;

        if (fill < 0) {
            return null;
        }

        return [...head, ...new Array<number>(fill).fill(0), ...tail];
    }

    return head.length === 16 ? head : null;
};

/**
 * Convert an IPv4/IPv6 address to its byte array (4 or 16 bytes), or null if invalid.
 * Handles an IPv4-mapped `::ffff:a.b.c.d` and a single `::` run in IPv6.
 * @param ip - the address
 */
export const ipToBytes = (ip: string): number[] | null => {
    const address = ip.trim();

    if (address.includes(':')) {
        return ipv6ToBytes(address);
    }

    return ipv4ToBytes(address);
};

/**
 * Whether `ip` is within the `cidr` (e.g. `192.168.1.0/24` or `fd00::/8`). Both must be
 * the same family. Returns false on anything malformed. Pure.
 * @param ip - the address to test
 * @param cidr - the CIDR range
 */
export const ipInCidr = (ip: string, cidr: string): boolean => {
    const slash = cidr.indexOf('/');

    if (slash < 0) {
        return false;
    }

    const prefixLen = Number(cidr.slice(slash + 1));
    const network = ipToBytes(cidr.slice(0, slash));
    const address = ipToBytes(ip);

    if (network === null || address === null || network.length !== address.length) {
        return false;
    }

    if (!Number.isInteger(prefixLen) || prefixLen < 0 || prefixLen > network.length * 8) {
        return false;
    }

    let bitsLeft = prefixLen;

    for (let i = 0; i < network.length && bitsLeft > 0; i++) {
        const take = Math.min(8, bitsLeft);

        if (take === 8) {
            if (network[i] !== address[i]) {
                return false;
            }
        } else {
            // Compare only the high `take` bits by dropping the low (8 - take) bits.
            const divisor = 2 ** (8 - take);

            if (Math.floor(network[i] / divisor) !== Math.floor(address[i] / divisor)) {
                return false;
            }
        }

        bitsLeft -= take;
    }

    return true;
};

/**
 * Whether `ip` falls in any of the `cidrs`. Pure.
 * @param ip - the address to test
 * @param cidrs - the CIDR ranges
 */
export const ipInCidrRanges = (ip: string, cidrs: readonly string[]): boolean =>
    cidrs.some((cidr) => ipInCidr(ip, cidr));