import {Logger} from '@stefanwerfling/figtree';
import {buildKeaDhcp6Config, deriveKeaPdLan, ipInCidr, KeaPdLan, parseKeaPdLeases, parseNeighborLinkLocal} from 'flyingfish_core';
import {ChildProcess, execFile, spawn} from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {NetfilterNativeBinding, NftBindingLoader} from '../Netfilter/NftBindingLoader.js';

/**
 * A pd-server LAN as the reconcile loop knows it (interface + its link ULA + the delegated
 * lifetime). The runner derives the Kea PD subnet/pool from the ULA.
 */
export type KeaPdInput = {
    interface: string;
    ula: string;
    leaseSeconds: number;
};

const KEA_CONF = path.join(os.tmpdir(), 'ff-kea-dhcp6.conf');

const KEA_LEASES = path.join(os.tmpdir(), 'ff-kea-leases6.csv');

/**
 * Run `ip <args>` and resolve with its status + stdout (never rejects). Uses execFile with
 * ARRAY arguments (no shell), so values derived from the DHCPv6 exchange cannot inject a
 * command — the whole reason route installation lives here in code, not in a Kea-invoked
 * shell script.
 * @param args - the `ip` command arguments
 */
function runIp(args: string[]): Promise<{ok: boolean; stdout: string;}> {
    return new Promise((resolve): void => {
        execFile('ip', args, (error, stdout): void => {
            resolve({ok: !error, stdout: stdout ?? ''});
        });
    });
}

/**
 * KeaRunner — runs ONE `kea-dhcp6` process serving DHCPv6 prefix delegation for all
 * `pd-server` LANs (Pi-router epic — ULA-PD server), and installs the routes to the
 * delegated prefixes ITSELF (Kea only delegates). dnsmasq cannot delegate prefixes, so Kea
 * runs alongside it (dnsmasq keeps DHCPv4 + RA/SLAAC for direct clients).
 *
 * Routing is done in code (no run_script hook / shell-out): the runner watches Kea's
 * memfile lease database, and for each delegated prefix (IA_PD) resolves the requesting
 * router's link-local next-hop from the neighbour table (by the lease's MAC) and installs
 * `ip -6 route <prefix> via <link-local> dev <iface>` via execFile (array args, no shell).
 * Stale routes are removed when their lease is gone. Runs in the netdevice (NET_ADMIN,
 * host-net) container; real PD is only verifiable against a PD-capable downstream router.
 */
export class KeaRunner {

    private _process: ChildProcess | null = null;

    private _currentKey = '';

    private _lans: KeaPdLan[] = [];

    private _watching = false;

    /**
     * Installed delegated-prefix routes, keyed `<prefix>/<len>` → the route detail (so a
     * changed next-hop re-installs, and a vanished lease is removed).
     */
    private readonly _routes = new Map<string, {prefix: string; len: number; via: string; dev: string;}>();

    /**
     * Native rtnetlink binding for route add/del (loaded once); falls back to `ip` via
     * execFile when the addon or its route methods are unavailable.
     */
    private readonly _binding: NetfilterNativeBinding | null = NftBindingLoader.load();

    /**
     * Reconcile the running Kea to the given pd-server LAN set: (re)start it when the set
     * changes, stop it when there are none, and (re)sync the delegated-prefix routes each
     * call (so a route missed because the neighbour was not yet known is retried). Best-effort.
     * @param inputs - the pd-server LANs (interface + link ULA + lease seconds)
     */
    public reconcile(inputs: KeaPdInput[]): void {
        const pdLans = inputs
            .map((input) => deriveKeaPdLan(input.interface, input.ula, input.leaseSeconds))
            .filter((lan): lan is KeaPdLan => lan !== null);

        this._lans = pdLans;

        const key = JSON.stringify(pdLans);

        if (key !== this._currentKey || (pdLans.length > 0 && this._process === null)) {
            this._currentKey = key;
            this._restart(pdLans);
        }

        // Re-sync routes every reconcile (retries any that could not resolve a next-hop yet).
        if (pdLans.length > 0) {
            this._syncRoutes().catch((): void => {
                // best-effort
            });
        }
    }

    /**
     * Stop Kea + the lease watcher and drop the installed routes.
     */
    public stop(): void {
        if (this._watching) {
            fs.unwatchFile(KEA_LEASES);
            this._watching = false;
        }

        if (this._process !== null) {
            this._process.removeAllListeners('close');
            this._process.kill();
            this._process = null;
        }

        for (const [, route] of this._routes) {
            void this._routeDel(route.prefix, route.len, route.dev);
        }

        this._routes.clear();
    }

    /**
     * Install/replace an IPv6 route via the native rtnetlink binding, falling back to `ip`
     * (execFile, array args — no shell) when the binding is unavailable.
     * @param prefix - the delegated prefix network address
     * @param len - the prefix length
     * @param via - the next-hop link-local
     * @param dev - the LAN interface
     */
    private async _routeReplace(prefix: string, len: number, via: string, dev: string): Promise<boolean> {
        if (typeof this._binding?.routeReplaceV6 === 'function') {
            try {
                this._binding.routeReplaceV6(prefix, len, via, dev);

                return true;
            } catch (error) {
                Logger.getLogger().warn(`Netdevice PD: native route add failed for ${prefix}/${len}`, error);

                return false;
            }
        }

        return (await runIp(['-6', 'route', 'replace', `${prefix}/${len}`, 'via', via, 'dev', dev])).ok;
    }

    /**
     * Delete an IPv6 route via the native binding, falling back to `ip`.
     * @param prefix - the delegated prefix network address
     * @param len - the prefix length
     * @param dev - the LAN interface
     */
    private async _routeDel(prefix: string, len: number, dev: string): Promise<void> {
        if (typeof this._binding?.routeDelV6 === 'function') {
            try {
                this._binding.routeDelV6(prefix, len, dev);
            } catch {
                // best-effort
            }

            return;
        }

        await runIp(['-6', 'route', 'del', `${prefix}/${len}`, 'dev', dev]);
    }

    /**
     * (Re)start Kea for the given LAN set, or stop it when empty.
     * @param pdLans - the resolved pd-server LANs
     */
    private _restart(pdLans: KeaPdLan[]): void {
        this.stop();

        if (pdLans.length === 0) {
            return;
        }

        // Kea needs its runtime dirs to exist for the PID/lock files (/run/kea, a tmpfs
        // recreated each boot) and the persisted server DUID (/var/lib/kea); create them
        // best-effort so kea-dhcp6 doesn't fatal on start.
        for (const dir of ['/run/kea', '/var/lib/kea']) {
            try {
                fs.mkdirSync(dir, {recursive: true});
            } catch {
                // best-effort
            }
        }

        fs.writeFileSync(KEA_CONF, buildKeaDhcp6Config(pdLans, KEA_LEASES));

        this._process = spawn('kea-dhcp6', ['-c', KEA_CONF], {stdio: ['ignore', 'ignore', 'pipe']});

        this._process.stderr?.on('data', (chunk: Buffer): void => {
            Logger.getLogger().silly(`kea-dhcp6: ${chunk.toString().trim()}`);
        });

        this._process.on('error', (error: Error): void => {
            Logger.getLogger().error('Netdevice PD: kea-dhcp6 failed to start', error);
        });

        this._process.on('close', (code: number | null): void => {
            Logger.getLogger().warn(`Netdevice PD: kea-dhcp6 exited (code ${code}); restarting in 5s`);
            this._process = null;
            this._currentKey = '';
            setTimeout((): void => this._restart(this._lans), 5000).unref();
        });

        if (!this._watching) {
            this._watching = true;
            fs.watchFile(KEA_LEASES, {interval: 5000}, (): void => {
                this._syncRoutes().catch((): void => {
                    // best-effort
                });
            });
        }

        Logger.getLogger().info(`Netdevice PD: kea-dhcp6 delegating on ${pdLans.map((lan) => lan.interface).join(', ')}`);
    }

    /**
     * Reconcile the delegated-prefix routes to Kea's current leases: add/update a route for
     * each delegated prefix (via the requesting router's link-local, by MAC) and remove
     * routes whose lease is gone. Best-effort — a prefix whose next-hop can't be resolved
     * yet is retried on the next lease-file change / reconcile.
     */
    private async _syncRoutes(): Promise<void> {
        let csv: string;

        try {
            csv = await fs.promises.readFile(KEA_LEASES, 'utf8');
        } catch {
            return;
        }

        const desired = new Set<string>();

        for (const lease of parseKeaPdLeases(csv)) {
            const lan = this._lans.find((entry) => ipInCidr(lease.prefix, `${entry.poolPrefix}/${entry.poolPrefixLength}`));

            if (lan === undefined || lease.hwaddr === '') {
                continue;
            }

            const routeKey = `${lease.prefix}/${lease.prefixLength}`;
            desired.add(routeKey);

            // Neigh lookup is a READ — execFile `ip` (parsed by the tested pure helper) is
            // fine; only the route WRITE goes through the native binding.
            const neigh = await runIp(['-6', 'neigh', 'show', 'dev', lan.interface]);
            const nextHop = parseNeighborLinkLocal(neigh.stdout, lease.hwaddr);

            if (nextHop === '' || this._routes.get(routeKey)?.via === nextHop) {
                continue;
            }

            if (await this._routeReplace(lease.prefix, lease.prefixLength, nextHop, lan.interface)) {
                this._routes.set(routeKey, {prefix: lease.prefix, len: lease.prefixLength, via: nextHop, dev: lan.interface});
                Logger.getLogger().info(`Netdevice PD: routed ${routeKey} via ${nextHop} dev ${lan.interface}`);
            }
        }

        // Remove routes whose lease is gone.
        for (const [routeKey, route] of [...this._routes]) {
            if (!desired.has(routeKey)) {
                await this._routeDel(route.prefix, route.len, route.dev);
                this._routes.delete(routeKey);
                Logger.getLogger().info(`Netdevice PD: removed stale route ${routeKey}`);
            }
        }
    }

}
