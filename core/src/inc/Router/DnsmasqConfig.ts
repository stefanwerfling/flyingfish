/**
 * The LAN DHCP/RA state a dnsmasq config is generated from (Pi-router epic, Phase 4):
 * the resolved LAN interface + the DhcpServerConfig. dnsmasq runs DHCP + IPv6 RA only —
 * NOT DNS (LAN clients get the FlyingFish dnsserver as their resolver, handed out as
 * `dnsServer`), so the generated config sets `port=0` to disable dnsmasq's own DNS.
 */
export type DnsmasqConfig = {
    lanInterface: string;
    enable: boolean;
    rangeStart: string;
    rangeEnd: string;
    leaseSeconds: number;
    gateway: string;
    dnsServer: string;
    domain: string;
    raEnable: boolean;
    leaseFile: string;
};

/**
 * One active DHCP lease parsed from the dnsmasq lease file.
 */
export type DnsmasqLease = {
    mac_address: string;
    ip_address: string;
    hostname: string;
    expires: number;
};

/**
 * Build the dnsmasq configuration for the LAN DHCP/RA server (Pi-router epic, Phase 4).
 * Pure + deterministic so it is fully unit-testable; the ff-lan part writes this to a
 * file and runs `dnsmasq -C <file>`. Returns '' when DHCP is disabled or no LAN
 * interface is set (the part then runs no dnsmasq).
 *
 * - `port=0` disables dnsmasq's DNS (the FlyingFish dnsserver is the LAN resolver).
 * - `interface` + `bind-interfaces` scope it to the LAN NIC only.
 * - `dhcp-range` (+ lease), `option:router` (gateway) and `option:dns-server`
 *   (the FlyingFish resolver) configure DHCPv4.
 * - when `raEnable`, `enable-ra` + a `constructor:<lan>` IPv6 range advertise whatever
 *   /64 the LAN interface currently holds (handles a dynamic Telekom /64 in both the
 *   NAT66-ULA and DHCPv6-PD modes).
 * @param config - the resolved LAN DHCP config
 */
export const buildDnsmasqConfig = (config: DnsmasqConfig): string => {
    if (!config.enable || config.lanInterface === '') {
        return '';
    }

    const lines: string[] = [
        'port=0',
        `interface=${config.lanInterface}`,
        'bind-interfaces',
        'dhcp-authoritative',
        `dhcp-leasefile=${config.leaseFile}`
    ];

    if (config.rangeStart !== '' && config.rangeEnd !== '') {
        lines.push(`dhcp-range=${config.rangeStart},${config.rangeEnd},${config.leaseSeconds}s`);
    }

    if (config.gateway !== '') {
        lines.push(`dhcp-option=option:router,${config.gateway}`);
    }

    if (config.dnsServer !== '') {
        lines.push(`dhcp-option=option:dns-server,${config.dnsServer}`);
    }

    if (config.domain !== '') {
        lines.push(`domain=${config.domain}`);
    }

    if (config.raEnable) {
        lines.push('enable-ra');
        lines.push(`dhcp-range=::,constructor:${config.lanInterface},ra-names,slaac,${config.leaseSeconds}s`);
    }

    return `${lines.join('\n')}\n`;
};

/**
 * Parse the dnsmasq lease file (Pi-router epic, Phase 4). Each line is
 * `<expiry-epoch> <mac> <ip> <hostname> <client-id>`; a `*` hostname means none.
 * Malformed lines are skipped. Pure.
 * @param content - the lease file content
 */
export const parseDnsmasqLeases = (content: string): DnsmasqLease[] => {
    const leases: DnsmasqLease[] = [];

    for (const line of content.split('\n')) {
        const parts = line.trim().split(/\s+/u);

        if (parts.length < 4) {
            continue;
        }

        const expires = Number(parts[0]);

        leases.push({
            mac_address: parts[1],
            ip_address: parts[2],
            hostname: parts[3] === '*' ? '' : parts[3],
            expires: Number.isFinite(expires) ? expires : 0
        });
    }

    return leases;
};