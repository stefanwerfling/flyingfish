import {Logger} from '@stefanwerfling/figtree';
import {execFile} from 'child_process';

/**
 * Run `ip <args>` and resolve with its exit status + stderr (never rejects).
 * @param args - the `ip` command arguments
 */
function runIp(args: string[]): Promise<{ok: boolean; stderr: string;}> {
    return new Promise((resolve): void => {
        execFile('ip', args, (error, _stdout, stderr): void => {
            resolve({ok: !error, stderr: stderr ?? ''});
        });
    });
}

/**
 * Ensure a LAN interface is up and carries its configured static IPv4 address (the LAN
 * gateway / subnet the DHCP clients are routed through). dnsmasq only serves on an
 * interface that already owns an address in the served subnet, and — unlike the WAN
 * interface (udhcpc) — nothing else assigns the LAN address, so the netdevice part sets
 * it here. Idempotent: an "already assigned" error (EEXIST) is treated as success.
 * @param iface - the LAN interface name
 * @param address - the static IPv4 address
 * @param prefix - the IPv4 prefix length
 */
export async function ensureLanAddress(iface: string, address: string, prefix: number): Promise<void> {
    if (iface === '' || address === '' || prefix <= 0) {
        return;
    }

    await runIp(['link', 'set', 'dev', iface, 'up']);

    const result = await runIp(['addr', 'add', `${address}/${prefix}`, 'dev', iface]);

    // Idempotent: both iproute2 ("File exists") and the netlink-style ("Address already
    // assigned") messages mean the address is already present — treat as success.
    if (!result.ok && !(/File exists|already assigned/iu).test(result.stderr)) {
        Logger.getLogger().warn(`Netdevice LAN: could not set ${address}/${prefix} on ${iface}: ${result.stderr.trim()}`);
    }
}
