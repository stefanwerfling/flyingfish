/**
 * Router-sim config generator (Pi-router epic — netns simulation harness).
 *
 * Drives the SAME pure builders the backend + netdevice use in production, so the
 * simulation exercises the real config-generation path (not a hand-written stand-in):
 *   - resolveNftablesRouterConfig() : DB-shaped interface rows + NAT policy -> router DTO
 *   - buildNftablesRuleset()        : router DTO -> `nft -f`-loadable ruleset + sysctls
 *   - buildDnsmasqConfig()          : resolved LAN DHCP config -> dnsmasq.conf text
 *
 * Usage:  node gen-config.mjs <scenario.json> <out-dir>
 * Writes: <out-dir>/router.nft, <out-dir>/sysctls, <out-dir>/<lan>.conf
 * Prints: a one-line JSON summary on stdout (consumed by the bash harness).
 *
 * Imports the compiled builders directly (core is ESM, type: module) to stay
 * dependency-light — no DB/typeorm barrel is pulled in.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const coreRouter = resolve(here, '../../../core/dist/src/inc/Router');

const {resolveNftablesRouterConfig, buildNftablesRuleset} = await import(`${coreRouter}/NftablesRuleset.js`);
const {buildDnsmasqConfig} = await import(`${coreRouter}/DnsmasqConfig.js`);

const [, , scenarioPath, outDir] = process.argv;

if (!scenarioPath || !outDir) {
    process.stderr.write('usage: node gen-config.mjs <scenario.json> <out-dir>\n');
    process.exit(2);
}

const scenario = JSON.parse(readFileSync(scenarioPath, 'utf8'));

// 1) nftables ruleset + sysctls via the exact backend resolver + builder.
const routerConfig = resolveNftablesRouterConfig(scenario.interfaces, scenario.policy ?? null);
const {ruleset, sysctls} = buildNftablesRuleset(routerConfig);
writeFileSync(`${outDir}/router.nft`, `${ruleset}\n`);
writeFileSync(`${outDir}/sysctls`, sysctls.map((s) => `${s.key}=${s.value}`).join('\n') + (sysctls.length ? '\n' : ''));

// 2) one dnsmasq.conf per LAN DHCP config via the real builder.
const dhcpConfigs = Array.isArray(scenario.dhcp) ? scenario.dhcp : (scenario.dhcp ? [scenario.dhcp] : []);
const dhcpFiles = [];

for (const dhcp of dhcpConfigs) {
    const conf = buildDnsmasqConfig(dhcp);

    if (conf === '') {
        continue;
    }

    const file = `${outDir}/${dhcp.lanInterface}.conf`;
    writeFileSync(file, conf);
    dhcpFiles.push({lanInterface: dhcp.lanInterface, confFile: file, leaseFile: dhcp.leaseFile});
}

process.stdout.write(`${JSON.stringify({
    wanInterface: routerConfig.wanInterface,
    lans: routerConfig.lans,
    forward: routerConfig.forward,
    sysctls,
    dhcpFiles
})}\n`);
