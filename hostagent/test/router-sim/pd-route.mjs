/**
 * Router-sim PD route applier (Pi-router epic — netns simulation harness, PD tier).
 *
 * Runs the REAL netdevice prefix-delegation route-installation path the KeaRunner uses,
 * against a real kernel in the router netns — WITHOUT the Pi and WITHOUT sudo:
 *   parseKeaPdLeases(csv)  →  for each IA_PD prefix in the pool:
 *     ipInCidr(prefix, pool)  →  `ip -6 neigh show dev <iface>`  →
 *     parseNeighborLinkLocal(neigh, hwaddr)  →  native routeReplaceV6(prefix,len,via,dev)
 * i.e. the exact chain of core helpers + the Rust rtnetlink binding that
 * `KeaRunner._syncRoutes` orchestrates in production (minus the fs.watch loop).
 *
 * kea-dhcp6 itself is NOT run here (not installable rootless); the delegated-prefix
 * lease is supplied as a Kea memfile6 CSV (the same real format pinned by the
 * KeaDhcp6Config unit tests). Everything downstream of the lease line — pool match,
 * neighbour correlation and the native route write — is the real production code
 * against the real kernel.
 *
 * Run inside the router netns:
 *   FF_PD_CSV=<leases.csv> FF_PD_IFACE=<lan> FF_PD_ULA=<ula/prefix> node pd-route.mjs
 *
 * Prints one `routed <prefix>/<len> via <ll> dev <iface>` line per installed route.
 */
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {readFileSync as readFile} from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const {deriveKeaPdLan, parseKeaPdLeases, parseNeighborLinkLocal, ipInCidr} =
    await import(resolve(here, '../../../core/dist/src/index.js'));
const {routeReplaceV6} = require(resolve(here, '../../../netfilternft/index.js'));

const csvPath = process.env.FF_PD_CSV;
const iface = process.env.FF_PD_IFACE;
const ula = process.env.FF_PD_ULA;

if (!csvPath || !iface || !ula) {
    process.stderr.write('usage: FF_PD_CSV=.. FF_PD_IFACE=.. FF_PD_ULA=.. node pd-route.mjs\n');
    process.exit(2);
}

// deriveKeaPdLan gives the delegation pool (poolPrefix/poolPrefixLength) — the same
// derivation the backend/netdevice do — so we only route prefixes carved from it.
const pdLan = deriveKeaPdLan(iface, ula, 3600);

if (pdLan === null) {
    process.stderr.write(`deriveKeaPdLan returned null for ${iface} ${ula}\n`);
    process.exit(1);
}

const pool = `${pdLan.poolPrefix}/${pdLan.poolPrefixLength}`;
const csv = readFile(csvPath, 'utf8');

let routed = 0;

for (const lease of parseKeaPdLeases(csv)) {
    if (!ipInCidr(lease.prefix, pool) || lease.hwaddr === '') {
        continue;
    }

    // Neighbour lookup is a READ (execFile `ip`, parsed by the tested pure helper);
    // only the route WRITE goes through the native binding — exactly as KeaRunner does.
    const neigh = execFileSync('ip', ['-6', 'neigh', 'show', 'dev', iface], {encoding: 'utf8'});
    const nextHop = parseNeighborLinkLocal(neigh, lease.hwaddr);

    if (nextHop === '') {
        process.stderr.write(`no next-hop for ${lease.hwaddr} yet\n`);
        continue;
    }

    routeReplaceV6(lease.prefix, lease.prefixLength, nextHop, iface);
    process.stdout.write(`routed ${lease.prefix}/${lease.prefixLength} via ${nextHop} dev ${iface}\n`);
    routed++;
}

process.stdout.write(`done: ${routed} route(s) installed\n`);
