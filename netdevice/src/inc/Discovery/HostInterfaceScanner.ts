import * as fs from 'fs';
import * as os from 'os';
import path from 'path';
import {AvailableInterface} from 'flyingfish_schemas';

/**
 * Default sysfs network directory. Because the netdevice part runs with
 * network_mode: host, this reflects the HOST's live NIC list — a hot-plugged USB
 * ethernet appears here (operstate=down until a cable is attached) without any
 * container restart.
 */
const SYS_CLASS_NET = '/sys/class/net';

/**
 * ARPHRD_ETHER — the sysfs `type` value for ethernet-class devices (eth*, USB
 * ethernet, wlan*). Loopback is 772; we only offer real ethernet-class NICs.
 */
const ARPHRD_ETHER = '1';

/**
 * Interface name prefixes that are virtual/container plumbing, not physical NICs
 * the operator would assign a router role to.
 */
const EXCLUDE_PREFIXES = ['lo', 'docker', 'veth', 'br-', 'virbr', 'flannel', 'cni', 'kube', 'dummy'];

/**
 * HostInterfaceScanner — enumerates the host's physical network interfaces by reading
 * sysfs (name, MAC, operstate) plus os.networkInterfaces() for the current IPv4. Used by
 * the netdevice part to report the available NICs to the Hub so the management UI can
 * offer a select box instead of a hand-typed MAC.
 */
export class HostInterfaceScanner {

    /**
     * Scan the host NICs.
     * @param {string} sysDir - sysfs net dir (override for tests)
     * @returns {AvailableInterface[]} discovered ethernet-class interfaces, sorted by name
     */
    public static scan(sysDir: string = SYS_CLASS_NET): AvailableInterface[] {
        let names: string[];

        try {
            names = fs.readdirSync(sysDir);
        } catch {
            return [];
        }

        const osIfaces = os.networkInterfaces();
        const out: AvailableInterface[] = [];

        for (const name of names.sort()) {
            if (EXCLUDE_PREFIXES.some((prefix) => name === prefix || name.startsWith(prefix))) {
                continue;
            }

            const base = path.join(sysDir, name);

            if (HostInterfaceScanner._read(path.join(base, 'type')) !== ARPHRD_ETHER) {
                continue;
            }

            const mac = HostInterfaceScanner._read(path.join(base, 'address'));
            const state = HostInterfaceScanner._read(path.join(base, 'operstate')) || 'unknown';
            const ipv4 = (osIfaces[name] ?? []).find(
                (addr) => addr.family === 'IPv4' && !addr.internal
            )?.address;
            // The current GLOBAL IPv6 (WAN GUA / LAN ULA), excluding link-local (fe80::)
            // and internal — informational for the UI so the operator can see IPv6 too.
            const ipv6 = (osIfaces[name] ?? []).find(
                (addr) => addr.family === 'IPv6' && !addr.internal &&
                    !addr.address.toLowerCase().startsWith('fe80')
            )?.address;

            const entry: AvailableInterface = {
                name: name,
                mac: mac,
                state: state
            };

            if (ipv4) {
                entry.ipv4 = ipv4;
            }

            if (ipv6) {
                entry.ipv6 = ipv6;
            }

            out.push(entry);
        }

        return out;
    }

    /**
     * Read a sysfs attribute file, trimmed; empty string on any error.
     * @param {string} file - the file path
     * @returns {string}
     */
    private static _read(file: string): string {
        try {
            return fs.readFileSync(file, 'utf8').trim();
        } catch {
            return '';
        }
    }

}
