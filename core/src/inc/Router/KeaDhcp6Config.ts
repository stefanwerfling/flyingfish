/**
 * Kea DHCPv6 prefix-delegation (PD) server config generator (Pi-router epic — ULA-PD
 * server). dnsmasq cannot delegate prefixes from a local pool (it is only a PD client /
 * relay), so for `pd-server` LAN interfaces the netdevice part runs `kea-dhcp6` alongside
 * dnsmasq: dnsmasq keeps doing IPv4 DHCP + IPv6 RA (SLAAC for direct clients), while Kea
 * hands DHCPv6-PD prefixes to DOWNSTREAM routers (e.g. a mesh node) from a private ULA
 * pool. The delegated prefixes are ULA, so they still reach the internet via the WAN
 * NAT66 masquerade (pd-server is treated like nat66 at the WAN). Pure + deterministic so
 * it is fully unit-testable.
 */

/**
 * One `pd-server` LAN + its delegation parameters.
 */
export type KeaPdLan = {
    /**
     * The LAN interface Kea listens/delegates on (e.g. `eth1`).
     */
    interface: string;

    /**
     * The on-link prefix (the LAN's own ULA /64, e.g. `fd00:50::/64`) — Kea's `subnet6`.
     */
    subnet: string;

    /**
     * The pool prefix the delegated prefixes are carved from (e.g. `fd00:50:1::`), disjoint
     * from the on-link /64.
     */
    poolPrefix: string;

    /**
     * The pool prefix length (e.g. 48) — must be shorter than `delegatedLength`.
     */
    poolPrefixLength: number;

    /**
     * The length of each delegated prefix handed to a downstream router (e.g. 60).
     */
    delegatedLength: number;

    /**
     * The delegated prefix (valid) lifetime in seconds.
     */
    leaseSeconds: number;
};

/**
 * Derive a {@link KeaPdLan} from a LAN's link ULA (as sent in the LAN config, e.g.
 * `fd00:50::1/64`). The on-link subnet is the ULA's /64; the delegation pool is
 * `<base>:1::/48` (disjoint from the on-link /64, since that lives in `<base>:0::`),
 * delegating /60s downstream. Returns null if the ULA is not the expected `<base>::<host>`
 * form. Pure — the netdevice part feeds it the ULA + interface.
 * @param iface - the LAN interface (e.g. `eth1`)
 * @param ula - the link ULA in CIDR form (e.g. `fd00:50::1/64`)
 * @param leaseSeconds - the delegated-prefix lifetime
 */
export const deriveKeaPdLan = (iface: string, ula: string, leaseSeconds: number): KeaPdLan | null => {
    const address = ula.split('/')[0];

    if (iface === '' || !address.includes('::')) {
        return null;
    }

    const base = address.split('::')[0];

    if (base === '') {
        return null;
    }

    return {
        interface: iface,
        subnet: `${base}::/64`,
        poolPrefix: `${base}:1::`,
        poolPrefixLength: 48,
        delegatedLength: 60,
        leaseSeconds: leaseSeconds
    };
};

/**
 * Build the `kea-dhcp6` JSON config for the given `pd-server` LANs. Returns '' when there
 * are none (the runner then starts no Kea). Each LAN becomes a `subnet6` with a `pd-pools`
 * entry. Kea only DELEGATES here — it does not install routes (no run_script hook, no
 * shell-out): the netdevice part watches the memfile lease database (`leaseFile`) and
 * installs the routes itself in code, so there is no script for an untrusted downstream to
 * inject into.
 * @param lans - the pd-server LANs
 * @param leaseFile - the memfile lease database path (CSV) the part watches
 */
export const buildKeaDhcp6Config = (lans: KeaPdLan[], leaseFile: string): string => {
    if (lans.length === 0) {
        return '';
    }

    const subnets = lans.map((lan, index) => ({
        'id': index + 1,
        'interface': lan.interface,
        'subnet': lan.subnet,
        'pd-pools': [
            {
                'prefix': lan.poolPrefix,
                'prefix-len': lan.poolPrefixLength,
                'delegated-len': lan.delegatedLength
            }
        ]
    }));

    const dhcp6 = {
        'interfaces-config': {
            'interfaces': lans.map((lan) => lan.interface)
        },
        'lease-database': {
            'type': 'memfile',
            'persist': true,
            'name': leaseFile
        },
        // A modest default; each delegated prefix uses this lifetime.
        'valid-lifetime': lans[0].leaseSeconds,
        'subnet6': subnets
    };

    return `${JSON.stringify({'Dhcp6': dhcp6}, null, 2)}\n`;
};

/**
 * A delegated prefix (IA_PD lease) parsed from Kea's memfile lease database.
 */
export type KeaPdLease = {
    /**
     * The delegated prefix (network address, e.g. `fd00:50:1:a00::`).
     */
    prefix: string;

    /**
     * The delegated prefix length (e.g. 60).
     */
    prefixLength: number;

    /**
     * The requesting router's hardware address (lower-case), used to resolve its link-local
     * next-hop from the neighbour table. Empty if Kea did not record one.
     */
    hwaddr: string;
};

/**
 * Kea memfile lease-type value for a delegated prefix (IA_PD). 0=IA_NA, 1=IA_TA, 2=IA_PD.
 */
const KEA_LEASE_TYPE_PD = '2';

/**
 * Kea memfile lease state value for a valid (default) lease. 1=declined, 2=expired.
 */
const KEA_LEASE_STATE_DEFAULT = '0';

/**
 * Parse Kea's memfile6 lease database (CSV) and return the valid DELEGATED prefixes
 * (IA_PD leases). Parses by HEADER name (robust to column order / Kea version). Malformed
 * rows are skipped. Pure — the netdevice part watches the file and installs a route per
 * returned prefix.
 * @param csv - the memfile CSV content
 */
export const parseKeaPdLeases = (csv: string): KeaPdLease[] => {
    const lines = csv.split('\n').map((line) => line.trim()).filter((line) => line !== '');

    if (lines.length < 2) {
        return [];
    }

    const header = lines[0].split(',');
    const iAddress = header.indexOf('address');
    const iLength = header.indexOf('prefix_len');
    const iType = header.indexOf('lease_type');
    const iHwaddr = header.indexOf('hwaddr');
    const iState = header.indexOf('state');

    if (iAddress < 0 || iLength < 0 || iType < 0) {
        return [];
    }

    const leases: KeaPdLease[] = [];

    for (const line of lines.slice(1)) {
        const cols = line.split(',');

        if (cols[iType] !== KEA_LEASE_TYPE_PD) {
            continue;
        }

        if (iState >= 0 && cols[iState] !== KEA_LEASE_STATE_DEFAULT) {
            continue;
        }

        const address = cols[iAddress] ?? '';
        const length = Number(cols[iLength]);

        if (address === '' || !Number.isInteger(length) || length <= 0) {
            continue;
        }

        leases.push({
            prefix: address,
            prefixLength: length,
            hwaddr: (iHwaddr >= 0 ? (cols[iHwaddr] ?? '') : '').toLowerCase()
        });
    }

    return leases;
};

/**
 * Resolve a hardware address to its link-local (fe80::) next-hop from `ip -6 neigh` output.
 * Prefers a link-local entry (routes to a delegated prefix must go via the router's
 * link-local). Returns '' if the MAC is not found. Pure — the netdevice part feeds it the
 * command output.
 * @param neighOutput - the `ip -6 neigh` output
 * @param hwaddr - the hardware address to match (any case)
 */
export const parseNeighborLinkLocal = (neighOutput: string, hwaddr: string): string => {
    if (hwaddr === '') {
        return '';
    }

    const mac = hwaddr.toLowerCase();
    let fallback = '';

    for (const line of neighOutput.split('\n')) {
        const parts = line.trim().split(/\s+/u);

        // `<addr> dev <if> lladdr <mac> [router] <state>`
        const llIndex = parts.indexOf('lladdr');

        if (llIndex < 1 || (parts[llIndex + 1] ?? '').toLowerCase() !== mac) {
            continue;
        }

        const address = parts[0];

        if (address.toLowerCase().startsWith('fe80')) {
            return address;
        }

        if (fallback === '') {
            fallback = address;
        }
    }

    return fallback;
};
