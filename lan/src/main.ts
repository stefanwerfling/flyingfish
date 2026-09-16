import {Args, Logger} from '@stefanwerfling/figtree';
import {
    DnsmasqConfig,
    PkiBootstrapSocketClient,
    PkiCaPurpose,
    PkiClientIdentity,
    PkiNodeClient,
    PkiNodeEnroller,
    PkiNodeFileStore,
    PkiNodeHttpTransport,
    startHubRegistration
} from 'flyingfish_core';
import {SchemaDefaultArgs} from 'figtree-schemas';
import {buildLanCapabilityManifest} from 'flyingfish_schemas';
import * as fs from 'fs';
import os from 'os';
import path from 'path';
import {Config} from './inc/Config/Config.js';
import {DhcpLeaseReporter} from './inc/Lan/DhcpLeaseReporter.js';
import {DnsmasqRunner} from './inc/Lan/DnsmasqRunner.js';
import {LanConfigClient} from './inc/Lan/LanConfigClient.js';

const LEASE_FILE = path.join(os.tmpdir(), 'ff-lan-dnsmasq.leases');

/**
 * Main — the LAN DHCP/RA-server part: enrolls a PKI service identity, self-registers
 * with the Hub, then on an interval pulls the LAN config, runs dnsmasq (DHCP + IPv6 RA,
 * no DNS) on the LAN interface and reports the active leases back. No server of its own.
 */
(async(): Promise<void> => {
    const argv = Args.get(SchemaDefaultArgs);
    let configfile = null;

    if (argv.config) {
        configfile = argv.config;

        try {
            if (!fs.existsSync(configfile)) {
                console.log(`Config not found: ${configfile}, exit.`);
                return;
            }
        } catch (err) {
            console.log(`Config is not load: ${configfile}, exit.`);
            console.error(err);
            return;
        }
    } else {
        const defaultConfig = path.join(path.resolve(), `/${Config.DEFAULT_CONFIG_FILE}`);

        if (fs.existsSync(defaultConfig)) {
            console.log(`Found and use setup config: ${defaultConfig} ....`);
            configfile = defaultConfig;
        }
    }

    let useEnv = false;

    if (argv.envargs && argv.envargs === '1') {
        useEnv = true;
    }

    const tConfig = await Config.getInstance().load(configfile, useEnv);

    if (tConfig === null) {
        console.log(`Configloader is return empty config, please check your configfile: ${configfile}`);
        return;
    }

    // -----------------------------------------------------------------------------------------------------------------

    Logger.getLogger();

    Logger.getLogger().info('Start FlyingFish LAN ...');

    const commonName = tConfig.pki?.commonName ?? `lan@${os.hostname()}`;

    // Node PKI (own-PKI epic 9.4): enroll + auto-renew this node's own service cert.
    let nodeIdentity: PkiClientIdentity | undefined;

    if (tConfig.pki) {
        try {
            const store = new PkiNodeFileStore(
                tConfig.pki.storeDir ?? tConfig.flyingfish_libpath ?? Config.DEFAULT_FF_DIR
            );

            const bootstrapSocket = tConfig.pki.bootstrapSocket;
            const bootstrapTokenProvider = bootstrapSocket
                ? (purpose: PkiCaPurpose): Promise<string> => new PkiBootstrapSocketClient(bootstrapSocket).fetchToken(purpose)
                : undefined;

            const enroller = new PkiNodeEnroller(
                new PkiNodeClient(new PkiNodeHttpTransport(tConfig.pki.url)),
                store,
                {
                    bootstrapToken: tConfig.pki.bootstrapToken,
                    bootstrapTokenProvider: bootstrapTokenProvider,
                    purpose: PkiCaPurpose.service,
                    commonName: commonName
                }
            );

            const identity = await enroller.ensure();

            nodeIdentity = {cert: identity.certificate, key: identity.privateKey};

            Logger.getLogger().info(`LAN PKI identity ready (nodeUid ${identity.nodeUid})`);
        } catch (error) {
            Logger.getLogger().error('LAN PKI enrollment failed (continuing without a node certificate)', error);
        }
    }

    // Announce this node to the Hub registry (part list). Optional.
    if (tConfig.registry) {
        await startHubRegistration(
            tConfig.registry.url,
            tConfig.registry.secret,
            buildLanCapabilityManifest(`lan@${os.hostname()}`),
            {identity: nodeIdentity}
        );
    }

    // Reconcile loop: pull the LAN config, run dnsmasq on the LAN interface, report the
    // active leases. Restart dnsmasq when the config changes. Best-effort each interval.
    if (tConfig.registry) {
        const configClient = new LanConfigClient(tConfig.registry.url, tConfig.registry.secret);
        const reporter = new DhcpLeaseReporter(tConfig.registry.url, tConfig.registry.secret);
        const intervalMs = tConfig.lan?.reconcileIntervalMs ?? Config.DEFAULT_RECONCILE_INTERVAL_MS;

        let runner: DnsmasqRunner | null = null;

        const reconcileOnce = async(): Promise<void> => {
            const lanConfig = await configClient.fetchConfig();

            if (lanConfig === null) {
                Logger.getLogger().warn('LAN: no config from the Hub yet (will retry next interval)');

                return;
            }

            const dnsmasqConfig: DnsmasqConfig = {...lanConfig, leaseFile: LEASE_FILE};

            if (runner !== null && runner.matches(dnsmasqConfig)) {
                return;
            }

            if (runner !== null) {
                runner.stop();
            }

            const iface = dnsmasqConfig.lanInterface;
            runner = new DnsmasqRunner(dnsmasqConfig, (leases): void => {
                reporter.report(leases, iface).catch((): void => {
                    // best-effort; the next lease change / reconcile retries
                });
            });
            runner.start();

            Logger.getLogger().info(`LAN: dnsmasq reconciled for ${iface === '' ? '(no interface)' : iface} (enable=${dnsmasqConfig.enable})`);
        };

        await reconcileOnce();

        setInterval((): void => {
            reconcileOnce().catch((error: unknown): void => {
                Logger.getLogger().warn('LAN reconcile failed (will retry next interval)', error);
            });
        }, intervalMs).unref();
    }
})().catch((error: unknown): void => {
    console.error('FlyingFish LAN failed to start:', error);
    process.exit(1);
});