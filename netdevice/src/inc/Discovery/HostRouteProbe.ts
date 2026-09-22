import {execFile} from 'child_process';
import {HimHIPData} from 'flyingfish_schemas';

/**
 * Run `ip <args>` and resolve with stdout (empty string on error; never rejects).
 * @param args - the `ip` command arguments
 */
function runIp(args: string[]): Promise<string> {
    return new Promise((resolve) => {
        execFile('ip', args, (error, stdout) => {
            resolve(error ? '' : stdout);
        });
    });
}

/**
 * HostRouteProbe — discovers this node's default-route facts on the host (netdevice runs
 * `network_mode: host` + NET_ADMIN): the host IP, default gateway + its interface via
 * `ip route get 1`, and the gateway's MAC from the neighbour/ARP table via `ip neigh`.
 * Replaces the former standalone HimHIP container (which used the same `ip route get` plus
 * an ARP lookup, published over Redis).
 */
export class HostRouteProbe {

    /**
     * Probe the host route + gateway MAC. Returns null if the default route can't be read.
     */
    public static async probe(): Promise<HimHIPData | null> {
        // e.g. "1.0.0.0 via 192.168.2.1 dev eth0 src 192.168.2.103 uid 0"
        const routeOut = (await runIp(['route', 'get', '1'])).trim();

        if (routeOut === '') {
            return null;
        }

        const parts = routeOut.split(/\s+/u);

        if (parts.length < 7 || parts[1] !== 'via' || parts[3] !== 'dev' || parts[5] !== 'src') {
            return null;
        }

        const network = parts[0];
        const gateway = parts[2];
        const iface = parts[4];
        const hostip = parts[6];

        // gateway MAC from the neighbour (ARP) table: "<gw> dev <if> lladdr aa:.. REACHABLE"
        let gatewaymac = '';
        const neigh = await runIp(['neigh', 'show', gateway]);
        const match = (/lladdr\s+([0-9a-fA-F:]{17})/u).exec(neigh);

        if (match) {
            gatewaymac = match[1].toLowerCase();
        }

        return {
            network,
            gateway,
            interface: iface,
            hostip,
            gatewaymac
        };
    }

}
