/**
 * Router-sim Tier-2 netfilter applier (Pi-router epic — netns simulation harness).
 *
 * Loads the REAL native addon `flyingfish_netfilternft` and calls its `applyRouter`,
 * so the actual Rust/rustables netlink code programs the nftables ruleset in the
 * router netns — the exact code the netdevice part runs in production (via
 * NetfilterApplier -> NftBindingLoader). The resolved config comes from the same
 * `resolveNftablesRouterConfig` resolver the backend serves.
 *
 * Run inside the router netns:  ip netns exec router node apply-native.mjs <scenario.json>
 *
 * Requires the addon to be built (netfilternft/*.node + index.js — `npm run build`
 * in netfilternft/, or extracted from the netdevice Docker build stage).
 */
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const {resolveNftablesRouterConfig} = await import(resolve(here, '../../../core/dist/src/inc/Router/NftablesRuleset.js'));
const {applyRouter} = require(resolve(here, '../../../netfilternft/index.js'));

const scenarioPath = process.argv[2];

if (!scenarioPath) {
    process.stderr.write('usage: node apply-native.mjs <scenario.json>\n');
    process.exit(2);
}

const scenario = JSON.parse(readFileSync(scenarioPath, 'utf8'));
const cfg = resolveNftablesRouterConfig(scenario.interfaces, scenario.policy ?? null);

applyRouter(cfg.wanInterface, cfg.lans, cfg.forward, cfg.forwards ?? []);

process.stdout.write(`applyRouter ok: wan=${cfg.wanInterface} lans=${JSON.stringify(cfg.lans)} forward=${cfg.forward} forwards=${JSON.stringify(cfg.forwards ?? [])}\n`);
