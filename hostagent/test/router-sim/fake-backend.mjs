/**
 * Router-sim Tier-3 fake backend/Hub (Pi-router epic — netns simulation harness).
 *
 * A minimal HTTP stub that serves the exact `/json/router/*` + `/json/registry/*` DTOs
 * the REAL netdevice reconcile loop (netdevice/dist/main.js) talks to, so the whole part
 * — PKI-less boot, Hub registration, udhcpc/dnsmasq/netfilter reconcile AND the report
 * POSTs — can run without the physical Pi and without the real backend/DB.
 *
 * Config responses are derived from the scenario via the real resolveNftablesRouterConfig
 * resolver (same shape the backend serves). Every report the netdevice sends back
 * (available-interfaces, wan-lease, dhcp-leases) + the registration are recorded into the
 * state file so the harness can assert the loop actually ran end-to-end.
 *
 * Usage:  node fake-backend.mjs <scenario.json> <state-file> <port>
 */
import {createServer} from 'node:http';
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const {resolveNftablesRouterConfig} = await import(resolve(here, '../../../core/dist/src/inc/Router/NftablesRuleset.js'));

const [, , scenarioPath, statePath, portArg] = process.argv;
const scenario = JSON.parse(readFileSync(scenarioPath, 'utf8'));
const port = Number(portArg);

const routerConfig = resolveNftablesRouterConfig(scenario.interfaces, scenario.policy ?? null);

// LAN config DTOs (one per DHCP entry), enriched with the static LAN address/prefix the
// real backend takes from the NetworkInterface (here: from the scenario `sim` block).
const dhcp = Array.isArray(scenario.dhcp) ? scenario.dhcp : (scenario.dhcp ? [scenario.dhcp] : []);
const lanConfigs = dhcp.map((d) => ({
    lanInterface: d.lanInterface,
    address: scenario.sim?.lanAddress ?? '',
    prefix: scenario.sim?.lanPrefix ?? 24,
    enable: d.enable,
    rangeStart: d.rangeStart,
    rangeEnd: d.rangeEnd,
    leaseSeconds: d.leaseSeconds,
    gateway: d.gateway,
    dnsServer: d.dnsServer,
    domain: d.domain,
    raEnable: d.raEnable
}));

const state = {registered: false, availableInterfaces: null, wanLease: null, dhcpLeases: [], heartbeats: 0};
const persist = () => writeFileSync(statePath, JSON.stringify(state, null, 2));
persist();

const readBody = (req) => new Promise((res) => {
    let buf = '';
    req.on('data', (c) => (buf += c));
    req.on('end', () => {
        try {
            res(buf ? JSON.parse(buf) : {});
        } catch {
            res({});
        }
    });
});

const send = (res, obj) => {
    res.writeHead(200, {'content-type': 'application/json'});
    res.end(JSON.stringify(obj));
};

createServer(async(req, res) => {
    const url = (req.url ?? '').split('?')[0];
    process.stdout.write(`REQ ${req.method} ${url}\n`);

    // Hub registry lifecycle — must echo statusCode "200" (StatusCodes.OK).
    if (url === '/json/registry/register') {
        state.registered = true; persist();
        return send(res, {statusCode: '200'});
    }
    if (url === '/json/registry/heartbeat') {
        state.heartbeats += 1; persist();
        return send(res, {statusCode: '200'});
    }
    if (url === '/json/registry/bye') {
        return send(res, {statusCode: '200'});
    }

    // Router config the reconcile loop pulls.
    if (url === '/json/router/netfilter-config') {
        return send(res, {config: routerConfig});
    }
    if (url === '/json/router/lan-config') {
        return send(res, {configs: lanConfigs});
    }

    // Reports the reconcile loop pushes back — record them.
    if (url === '/json/router/available-interfaces') {
        const body = await readBody(req);
        state.availableInterfaces = body.interfaces ?? body; persist();
        return send(res, {statusCode: '200'});
    }
    if (url === '/json/router/wan-lease') {
        state.wanLease = await readBody(req); persist();
        return send(res, {statusCode: '200'});
    }
    if (url === '/json/router/dhcp-leases') {
        const body = await readBody(req);
        state.dhcpLeases = body.leases ?? body; persist();
        return send(res, {statusCode: '200'});
    }

    res.writeHead(404); res.end();
}).listen(port, '127.0.0.1', () => {
    process.stdout.write(`fake-backend listening on 127.0.0.1:${port}\n`);
});
