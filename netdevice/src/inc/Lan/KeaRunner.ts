import {Logger} from '@stefanwerfling/figtree';
import {buildKeaDhcp6Config, deriveKeaPdLan, ipInCidr, KeaPdLan, parseKeaPdLeases, parseNeighborLinkLocal} from 'flyingfish_core';
import {ChildProcess, execFile, spawn} from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

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
     * Installed delegated-prefix routes: `<prefix>/<len>` → the link-local next-hop used
     * (so a changed next-hop re-installs, and a vanished lease is removed).
     */
    private readonly _routes = new Map<string, string>();

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

        for (const [prefix] of this._routes) {
            void runIp(['-6', 'route', 'del', prefix]);
        }

        this._routes.clear();
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

            const neigh = await runIp(['-6', 'neigh', 'show', 'dev', lan.interface]);
            const nextHop = parseNeighborLinkLocal(neigh.stdout, lease.hwaddr);

            if (nextHop === '') {
                continue;
            }

            if (this._routes.get(routeKey) === nextHop) {
                continue;
            }

            const result = await runIp(['-6', 'route', 'replace', routeKey, 'via', nextHop, 'dev', lan.interface]);

            if (result.ok) {
                this._routes.set(routeKey, nextHop);
                Logger.getLogger().info(`Netdevice PD: routed ${routeKey} via ${nextHop} dev ${lan.interface}`);
            }
        }

        // Remove routes whose lease is gone.
        for (const routeKey of [...this._routes.keys()]) {
            if (!desired.has(routeKey)) {
                await runIp(['-6', 'route', 'del', routeKey]);
                this._routes.delete(routeKey);
                Logger.getLogger().info(`Netdevice PD: removed stale route ${routeKey}`);
            }
        }
    }

}
