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

/**
 * Add an IPv6 address to a LAN interface, idempotently (EEXIST / "already assigned" =
 * success).
 * @param iface - the interface
 * @param cidr - the address in CIDR form (e.g. `fd00:50::1/64`, `fe80::1/64`)
 * @param extraArgs - extra `ip -6 addr add` args (e.g. `['scope','link']`)
 */
async function addIpv6(iface: string, cidr: string, extraArgs: string[] = []): Promise<void> {
    const result = await runIp(['-6', 'addr', 'add', cidr, 'dev', iface, ...extraArgs]);

    if (!result.ok && !(/File exists|already assigned/iu).test(result.stderr)) {
        Logger.getLogger().warn(`Netdevice LAN: could not set ${cidr} on ${iface}: ${result.stderr.trim()}`);
    }
}

/**
 * Ensure a LAN interface has the IPv6 addressing its mode needs. For `nat66` the LAN uses
 * a private ULA /64 masqueraded to the WAN GUA — nothing else assigns it, so the part sets
 * it here. CRUCIALLY it also ensures a LINK-LOCAL (fe80::) address: Router Advertisements
 * MUST be sourced from a link-local, and the interface's addr_gen_mode may be "none" (no
 * auto link-local was generated), in which case dnsmasq logs RAs it can never put on the
 * wire — so no client ever gets IPv6. fe80::1 is the conventional router link-local (the
 * same one upstream ISP routers hand out). `pd` mode routes the delegated prefix via
 * dnsmasq's `constructor:<lan>` and needs no static ULA; `off` does nothing.
 * @param iface - the LAN interface name
 * @param ipv6Mode - off | nat66 | pd
 * @param ula - the ULA gateway address in CIDR form (nat66 only; empty otherwise)
 */
export async function ensureLanIpv6(iface: string, ipv6Mode: string, ula: string): Promise<void> {
    if (iface === '' || ipv6Mode !== 'nat66' || ula === '') {
        return;
    }

    await runIp(['link', 'set', 'dev', iface, 'up']);
    await addIpv6(iface, 'fe80::1/64', ['scope', 'link']);
    await addIpv6(iface, ula);
}
