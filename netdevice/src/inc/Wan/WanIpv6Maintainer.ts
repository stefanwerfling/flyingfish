import {Logger} from '@stefanwerfling/figtree';
import {execFile} from 'child_process';

/**
 * One global IPv6 address found on the WAN interface, as parsed from `ip -o -6 addr`.
 */
export type WanGlobalV6Address = {

    /**
     * The address without its prefix length (e.g. `2003:fc:5f24:d035:6ad6:7402:698:fa87`).
     */
    address: string;

    /**
     * The prefix length (normally 64 for a SLAAC GUA).
     */
    prefixLen: number;

    /**
     * The /64 network the address lives in — the first four hextets as written
     * (e.g. `2003:fc:5f24:d035`). Used to detect ISP prefix rotations.
     */
    prefix64: string;

    /**
     * Whether the kernel has DEPRECATED the address (`preferred_lft 0`). A deprecated GUA is
     * a leftover of a previous ISP prefix: the upstream no longer routes it, so it is a
     * black hole for any NAT66 traffic masqueraded to it.
     */
    deprecated: boolean;
};

/**
 * Run `ip <args>` capturing stdout; never rejects (resolves with ok=false on error).
 * @param args - the `ip` command arguments
 */
function runIpOut(args: string[]): Promise<{ok: boolean; stdout: string; stderr: string;}> {
    return new Promise((resolve): void => {
        execFile('ip', args, (error, stdout, stderr): void => {
            resolve({ok: !error, stdout: stdout ?? '', stderr: stderr ?? ''});
        });
    });
}

/**
 * Parse the output of `ip -o -6 addr show dev <wan> scope global` into the WAN's global
 * IPv6 addresses. ULA (`fc00::/7`) and link-local (`fe80::/10`) are skipped — only
 * globally-routable unicast (`2000::/3`) GUAs are returned, since those are the ones the
 * upstream ISP delegates and rotates. Pure (no I/O) so it is unit-testable.
 * @param output - raw stdout of the `ip -o -6 addr` command
 */
export function parseWanGlobalV6(output: string): WanGlobalV6Address[] {
    const result: WanGlobalV6Address[] = [];

    for (const line of output.split('\n')) {
        const match = (/inet6\s+([0-9a-fA-F:]+)\/(\d+)/u).exec(line);

        if (match === null) {
            continue;
        }

        const address = match[1].toLowerCase();
        const prefixLen = parseInt(match[2], 10);

        // Only touch globally-routable unicast (2000::/3). Skip ULA (fc00::/7 → fc/fd) and
        // anything else, so the LAN ULA / link-locals are never affected.
        if (!(/^[23][0-9a-f]{3}:/u).test(address)) {
            continue;
        }

        result.push({
            address: address,
            prefixLen: prefixLen,
            prefix64: address.split(':', 4).join(':'),
            deprecated: (/\bdeprecated\b/u).test(line)
        });
    }

    return result;
}

/**
 * Keeps the router's WAN IPv6 addressing healthy across ISP prefix rotations (Pi-router
 * epic — NAT66 stability).
 *
 * Dynamic-prefix ISPs (e.g. Telekom's daily forced reconnect) hand the WAN a NEW global
 * /64 and stop routing the old one — but the kernel keeps the OLD (now `deprecated`)
 * address on the interface for its full `valid_lft` (up to a week). That leaves the WAN
 * littered with black-hole prefixes, and any still-open NAT66 flow stays pinned in
 * conntrack to the dead old source address → LAN clients lose IPv6 until the entry ages
 * out. That is the intermittent "IPv6 works, then gone, then works" symptom.
 *
 * Each reconcile this part removes every deprecated global GUA from the WAN with
 * `ip -6 addr del`. Removing a masqueraded source address makes the kernel's
 * `nf_nat_masquerade` inet6 notifier purge exactly the conntrack entries that were NAT'd
 * to it — so pinned flows immediately re-NAT to the current, routable prefix instead of
 * hanging. Net effect: a prefix rotation becomes a sub-reconcile blip instead of a
 * minutes-long outage. Idempotent and self-healing: if NetworkManager re-adds a prefix
 * that is genuinely still advertised it simply stays (not deprecated); only dead ones go.
 */
export class WanIpv6Maintainer {

    /**
     * The last-seen preferred (non-deprecated) WAN /64 prefix, to log rotations exactly once.
     */
    private _lastPreferredPrefix = '';

    /**
     * Reconcile the WAN interface's global IPv6 addressing: drop deprecated (black-hole)
     * prefixes and log an ISP prefix rotation when the preferred prefix changes.
     * @param wanInterface - the WAN (uplink) interface name; empty = nothing to do
     */
    public async reconcile(wanInterface: string): Promise<void> {
        if (wanInterface === '') {
            return;
        }

        const show = await runIpOut(['-o', '-6', 'addr', 'show', 'dev', wanInterface, 'scope', 'global']);

        if (!show.ok) {
            return;
        }

        const addresses = parseWanGlobalV6(show.stdout);
        const removed: string[] = [];

        for (const addr of addresses) {
            if (!addr.deprecated) {
                continue;
            }

            const del = await runIpOut(['-6', 'addr', 'del', `${addr.address}/${addr.prefixLen}`, 'dev', wanInterface]);

            if (del.ok) {
                removed.push(`${addr.address}/${addr.prefixLen}`);
            } else if (!(/Cannot assign|not exist/iu).test(del.stderr)) {
                Logger.getLogger().warn(`Netdevice WAN: could not remove stale IPv6 ${addr.address}/${addr.prefixLen} on ${wanInterface}: ${del.stderr.trim()}`);
            }
        }

        if (removed.length > 0) {
            Logger.getLogger().info(
                `Netdevice WAN: removed ${removed.length} stale (deprecated) IPv6 prefix(es) on ` +
                `${wanInterface} [${removed.join(', ')}] — kernel purges their masqueraded conntrack entries`
            );
        }

        // Detect an ISP prefix rotation: the current preferred (non-deprecated) /64 changed.
        const preferred = addresses.filter((addr) => !addr.deprecated);
        const currentPrefix = preferred.length > 0 ? preferred[0].prefix64 : '';

        if (currentPrefix !== '') {
            if (this._lastPreferredPrefix !== '' && this._lastPreferredPrefix !== currentPrefix) {
                Logger.getLogger().info(
                    `Netdevice WAN: IPv6 prefix rotated ${this._lastPreferredPrefix}::/64 → ` +
                    `${currentPrefix}::/64 on ${wanInterface} (ISP reconnect) — NAT66 now masquerades to the new prefix`
                );
            }

            this._lastPreferredPrefix = currentPrefix;
        }
    }

}
