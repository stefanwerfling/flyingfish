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

            // Cumulative byte counters (rx/tx) from sysfs; the UI derives a live rate from
            // the delta between polls.
            const rxBytes = Number(HostInterfaceScanner._read(path.join(base, 'statistics', 'rx_bytes')));
            const txBytes = Number(HostInterfaceScanner._read(path.join(base, 'statistics', 'tx_bytes')));

            // Cumulative link up/down transition count; the UI derives a flap rate from the
            // delta between polls to warn about an unstable link (flapping USB NIC).
            const carrierChanges = Number(HostInterfaceScanner._read(path.join(base, 'carrier_changes')));

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

            if (Number.isFinite(rxBytes)) {
                entry.rxBytes = rxBytes;
            }

            if (Number.isFinite(txBytes)) {
                entry.txBytes = txBytes;
            }

            if (Number.isFinite(carrierChanges)) {
                entry.carrierChanges = carrierChanges;
            }

            out.push(entry);
        }

        return out;
    }

    /**
     * Whether a network interface currently exists on the host (present in sysfs). A USB
     * NIC that was unplugged is gone from here, so the reconcile can skip it instead of
     * failing every `ip` command with "Cannot find device".
     * @param {string} name - the interface name
     * @param {string} sysDir - sysfs net dir (override for tests)
     * @returns {boolean}
     */
    public static exists(name: string, sysDir: string = SYS_CLASS_NET): boolean {
        try {
            return fs.existsSync(path.join(sysDir, name));
        } catch {
            return false;
        }
    }

    /**
     * Whether an interface currently has carrier (a live link). Reads sysfs `carrier`
     * ("1" = up). Only meaningful when the interface is administratively up; the caller
     * brings it up first. A flapping/unplugged link reads "0", so the reconcile can skip
     * configuring/serving it (dnsmasq/Kea/addresses) until the link is stable.
     * @param {string} name - the interface name
     * @param {string} sysDir - sysfs net dir (override for tests)
     * @returns {boolean}
     */
    public static hasCarrier(name: string, sysDir: string = SYS_CLASS_NET): boolean {
        return HostInterfaceScanner._read(path.join(sysDir, name, 'carrier')) === '1';
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
