import {BaseHttpServer} from '@stefanwerfling/figtree';
import {NetworkInterfaceServiceDB, SystemConfigServiceDB, WanLeaseServiceDB} from 'flyingfish_core';
import {HimHIP} from '../HimHIP/HimHIP.js';

/**
 * NodeTargetResolver
 *
 * Resolves this node's single reachable "target IP" (Attach/Router epic) — the address
 * downstream consumers point at: the DNS server's follow-node A/AAAA records, the
 * HTTP→HTTPS redirect host, and self-referential nginx targets.
 *
 * Resolution order:
 *  1. `SystemConfig.target_ip` override, when set (non-empty).
 *  2. Otherwise by mode:
 *     - `attach`: the host default-route IP reported by netdevice (`HimHIP.hostip`).
 *     - `router`: the first enabled LAN interface's static IPv4, else the WAN lease IPv4,
 *       else the host default-route IP.
 *
 * Returns '' when nothing is resolvable yet (no override and no host facts) — consumers
 * then fall back to their stored value / leave the target unset.
 */
export class NodeTargetResolver {

    /**
     * Resolve the node's target IP (see class doc). Never throws — returns '' on any error.
     * @returns {Promise<string>}
     */
    public static async resolve(): Promise<string> {
        try {
            const config = await SystemConfigServiceDB.getInstance().getOrCreate();
            const override = config.target_ip.trim();

            if (override !== '') {
                return override;
            }

            const hostip = HimHIP.getData()?.hostip ?? '';

            if (config.mode === 'router') {
                const lans = await NetworkInterfaceServiceDB.getInstance().findByRole('lan');
                const lan = lans.find((iface) => !iface.disable && iface.ipv4_address.trim() !== '');

                if (lan) {
                    return lan.ipv4_address.trim();
                }

                const wanLease = await WanLeaseServiceDB.getInstance().get();

                if (wanLease && wanLease.ipv4_address.trim() !== '') {
                    return wanLease.ipv4_address.trim();
                }

                return hostip;
            }

            // attach mode
            return hostip;
        } catch {
            return '';
        }
    }

    /**
     * Point the HTTP→HTTPS redirect host at the resolved node target IP. No-op when the
     * target is not resolvable yet (keeps the previous host). Called on host-fact updates
     * (HimHIP) and after a system-config change.
     * @returns {Promise<void>}
     */
    public static async applyToRedirectHost(): Promise<void> {
        const targetIp = await NodeTargetResolver.resolve();

        if (targetIp !== '') {
            BaseHttpServer.setListenHost(targetIp);
        }
    }

}
