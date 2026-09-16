/**
 * A parsed WAN DHCP lease (Pi-router epic, Phase 3) — the fields ff-wan reports to the
 * backend. Matches the shape of the WAN lease report DTO.
 */
export type WanLeaseFields = {
    interface: string;
    ipv4_address: string;
    ipv4_prefix: number;
    gateway: string;
    dns_servers: string;
    ipv6_prefix: string;
    lease_seconds: number;
};

/**
 * Convert a dotted IPv4 netmask (e.g. `255.255.255.0`) to a CIDR prefix length (e.g.
 * 24). Returns 0 on anything malformed. Pure.
 * @param netmask - the dotted netmask
 */
export const netmaskToPrefix = (netmask: string): number => {
    const octets = netmask.split('.');

    if (octets.length !== 4) {
        return 0;
    }

    let bits = 0;

    for (const octet of octets) {
        const value = Number(octet);

        if (!Number.isInteger(value) || value < 0 || value > 255) {
            return 0;
        }

        bits += (value >>> 0).toString(2).split('').filter((bit) => bit === '1').length;
    }

    return bits;
};

/**
 * Parse a udhcpc lease from the environment variables udhcpc hands its bound/renew
 * hook (Pi-router epic, Phase 3): `interface`, `ip`, `subnet` (dotted netmask),
 * `router` (space-separated, first is the gateway), `dns` (space-separated), `lease`
 * (seconds). `ipv6_prefix` is carried through when the hook provides one (DHCPv6-PD).
 * Pure + defensive so a partial environment never throws.
 * @param env - the hook environment (string→string)
 */
export const parseUdhcpcLease = (env: Record<string, string>): WanLeaseFields => {
    const firstToken = (value: string | undefined): string => (value ?? '').trim().split(/\s+/u)[0] ?? '';
    const lease = Number(env.lease);

    return {
        interface: env.interface ?? '',
        ipv4_address: env.ip ?? '',
        ipv4_prefix: netmaskToPrefix(env.subnet ?? ''),
        gateway: firstToken(env.router),
        dns_servers: (env.dns ?? '').trim().split(/\s+/u).filter((entry) => entry.length > 0).join(','),
        ipv6_prefix: env.ipv6_prefix ?? '',
        lease_seconds: Number.isInteger(lease) && lease > 0 ? lease : 0
    };
};