/**
 * Tests for the Kea DHCPv6 prefix-delegation server helpers (Pi-router epic — ULA-PD
 * server). Pure/data-level: the kea-dhcp6 config (subnet6 + pd-pools, no shell-out hook),
 * the ULA→PD derivation, the memfile lease parser (delegated prefixes), and the neighbour
 * MAC→link-local resolver the netdevice part uses to route delegated prefixes.
 */
import {
    buildKeaDhcp6Config,
    deriveKeaPdLan,
    KeaPdLan,
    parseKeaPdLeases,
    parseNeighborLinkLocal
} from 'flyingfish_core';

const LEASE_FILE = '/tmp/kea-leases6.csv';

const lan: KeaPdLan = {
    interface: 'eth1',
    subnet: 'fd00:50::/64',
    poolPrefix: 'fd00:50:1::',
    poolPrefixLength: 48,
    delegatedLength: 60,
    leaseSeconds: 3600
};

describe('buildKeaDhcp6Config', () => {
    test('no pd-server LANs → empty string (runner starts no Kea)', () => {
        expect(buildKeaDhcp6Config([], LEASE_FILE)).toBe('');
    });

    test('one pd-server LAN → subnet6 with a pd-pool, memfile db, NO shell-out hook', () => {
        const parsed = JSON.parse(buildKeaDhcp6Config([lan], LEASE_FILE));

        expect(parsed.Dhcp6['interfaces-config'].interfaces).toEqual(['eth1']);
        expect(parsed.Dhcp6['lease-database']).toMatchObject({type: 'memfile', name: LEASE_FILE});

        const subnet = parsed.Dhcp6.subnet6[0];
        expect(subnet.interface).toBe('eth1');
        expect(subnet.subnet).toBe('fd00:50::/64');
        expect(subnet['pd-pools'][0]).toEqual({prefix: 'fd00:50:1::', 'prefix-len': 48, 'delegated-len': 60});

        // Route installation is done in netdevice code (watching the lease file), so NO
        // run_script hook / shell-out is wired — nothing for a downstream to inject into.
        expect(parsed.Dhcp6['hooks-libraries']).toBeUndefined();
    });

    test('multiple pd-server LANs each get their own subnet6 with a unique id', () => {
        const lan2: KeaPdLan = {...lan, interface: 'eth2', subnet: 'fd00:51::/64', poolPrefix: 'fd00:51:1::'};
        const parsed = JSON.parse(buildKeaDhcp6Config([lan, lan2], LEASE_FILE));

        expect(parsed.Dhcp6.subnet6).toHaveLength(2);
        expect(parsed.Dhcp6.subnet6.map((entry: {id: number}) => entry.id)).toEqual([1, 2]);
        expect(parsed.Dhcp6['interfaces-config'].interfaces).toEqual(['eth1', 'eth2']);
    });
});

describe('deriveKeaPdLan', () => {
    test('derives subnet + a disjoint /48 delegation pool from the link ULA', () => {
        expect(deriveKeaPdLan('eth1', 'fd00:50::1/64', 3600)).toEqual(lan);
    });

    test('empty interface or a non-`::` ULA → null', () => {
        expect(deriveKeaPdLan('', 'fd00:50::1/64', 3600)).toBeNull();
        expect(deriveKeaPdLan('eth1', '', 3600)).toBeNull();
        expect(deriveKeaPdLan('eth1', '10.0.0.1/24', 3600)).toBeNull();
    });
});

describe('parseKeaPdLeases', () => {
    const header = 'address,duid,valid_lifetime,expire,subnet_id,pref_lifetime,lease_type,iaid,prefix_len,fqdn_fwd,fqdn_rev,hostname,hwaddr,state,user_context,pool_id';

    test('returns only valid IA_PD (type 2, state 0) leases with prefix + len + hwaddr', () => {
        const csv = [
            header,
            'fd00:50:1:a00::,00:03:00:01:aa,3600,9999,1,1800,2,1,60,0,0,,aa:bb:cc:dd:ee:ff,0,,0',
            'fd00:50::5,00:03:00:01:bb,3600,9999,1,1800,0,1,128,0,0,,11:22:33:44:55:66,0,,0',
            'fd00:50:1:b00::,00:03:00:01:cc,3600,9999,1,1800,2,1,60,0,0,,de:ad:be:ef:00:01,2,,0'
        ].join('\n');

        expect(parseKeaPdLeases(csv)).toEqual([
            {prefix: 'fd00:50:1:a00::', prefixLength: 60, hwaddr: 'aa:bb:cc:dd:ee:ff'}
        ]);
    });

    test('empty / header-only input → []', () => {
        expect(parseKeaPdLeases('')).toEqual([]);
        expect(parseKeaPdLeases(header)).toEqual([]);
    });
});

describe('parseNeighborLinkLocal', () => {
    const neigh = [
        'fd00:50:1:a00::1 dev eth1 lladdr aa:bb:cc:dd:ee:ff router STALE',
        'fe80::a8bb:ccff:fedd:eeff dev eth1 lladdr aa:bb:cc:dd:ee:ff router REACHABLE',
        'fe80::1122 dev eth1 lladdr 11:22:33:44:55:66 REACHABLE'
    ].join('\n');

    test('prefers the link-local (fe80::) entry for the MAC', () => {
        expect(parseNeighborLinkLocal(neigh, 'aa:bb:cc:dd:ee:ff')).toBe('fe80::a8bb:ccff:fedd:eeff');
    });

    test('case-insensitive MAC match; unknown MAC or empty → ""', () => {
        expect(parseNeighborLinkLocal(neigh, 'AA:BB:CC:DD:EE:FF')).toBe('fe80::a8bb:ccff:fedd:eeff');
        expect(parseNeighborLinkLocal(neigh, '99:99:99:99:99:99')).toBe('');
        expect(parseNeighborLinkLocal(neigh, '')).toBe('');
    });
});
