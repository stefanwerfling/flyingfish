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
import {buildNetdeviceCapabilityManifest} from 'flyingfish_schemas';
import * as fs from 'fs';
import os from 'os';
import path from 'path';
import {Config} from './inc/Config/Config.js';
import {DhcpClientRunner} from './inc/Wan/DhcpClientRunner.js';
import {WanConfigClient} from './inc/Wan/WanConfigClient.js';
import {WanLeaseReporter} from './inc/Wan/WanLeaseReporter.js';
import {DhcpLeaseReporter} from './inc/Lan/DhcpLeaseReporter.js';
import {DnsmasqRunner} from './inc/Lan/DnsmasqRunner.js';
import {ensureLanAddress, ensureLanIpv6} from './inc/Lan/LanAddress.js';
import {LanConfigClient} from './inc/Lan/LanConfigClient.js';
import {HostInterfaceScanner} from './inc/Discovery/HostInterfaceScanner.js';
import {InterfaceReporter} from './inc/Discovery/InterfaceReporter.js';
import {NetfilterApplier} from './inc/Netfilter/NetfilterApplier.js';
import {NetfilterConfigClient} from './inc/Netfilter/NetfilterConfigClient.js';


/**
 * Main — the network-device router part: enrolls a PKI service identity, self-registers
 * with the Hub, then on an interval manages the host NICs by role — runs the WAN DHCP
 * client (udhcpc) on the `wan`-role interface (reporting its lease) and the LAN DHCP/RA
 * server (dnsmasq) on the `lan`-role interface (reporting its leases). No server of its
 * own; it is a pull+apply reconciler for both roles.
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

    Logger.getLogger().info('Start FlyingFish Netdevice ...');

    const commonName = tConfig.pki?.commonName ?? `netdevice@${os.hostname()}`;

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

            Logger.getLogger().info(`Netdevice PKI identity ready (nodeUid ${identity.nodeUid})`);
        } catch (error) {
            Logger.getLogger().error('Netdevice PKI enrollment failed (continuing without a node certificate)', error);
        }
    }

    // Announce this node to the Hub registry (part list). Optional and best-effort:
    // a failed registration (e.g. the backend is briefly unreachable during a
    // redeploy) must NOT crash the part. netdevice has no server of its own, so an
    // unhandled throw here would drain the event loop and exit — turning one blip
    // into a crash-loop. The heartbeat set up inside startHubRegistration re-registers
    // once the Hub is reachable again; if the initial call throws, the reconcile loop
    // below still runs and keeps the datapath alive.
    if (tConfig.registry) {
        try {
            await startHubRegistration(
                tConfig.registry.url,
                tConfig.registry.secret,
                buildNetdeviceCapabilityManifest(`netdevice@${os.hostname()}`),
                {identity: nodeIdentity}
            );
        } catch (error) {
            Logger.getLogger().warn('Netdevice Hub registration failed (continuing; will retry on heartbeat)', error);
        }
    }

    // Reconcile loop for BOTH roles: run udhcpc on the WAN interface (report its lease)
    // and dnsmasq on the LAN interface (report its leases); restart either when its
    // interface / config changes. Best-effort each interval.
    if (tConfig.registry) {
        const wanConfigClient = new WanConfigClient(tConfig.registry.url, tConfig.registry.secret);
        const wanReporter = new WanLeaseReporter(tConfig.registry.url, tConfig.registry.secret);
        const lanConfigClient = new LanConfigClient(tConfig.registry.url, tConfig.registry.secret);
        const lanReporter = new DhcpLeaseReporter(tConfig.registry.url, tConfig.registry.secret);
        const interfaceReporter = new InterfaceReporter(tConfig.registry.url, tConfig.registry.secret);
        const netfilterClient = new NetfilterConfigClient(tConfig.registry.url, tConfig.registry.secret);
        const netfilterApplier = new NetfilterApplier();
        const intervalMs = tConfig.netdevice?.reconcileIntervalMs ?? Config.DEFAULT_RECONCILE_INTERVAL_MS;

        if (!netfilterApplier.isAvailable()) {
            Logger.getLogger().warn('Netdevice netfilter: native binding unavailable — running without applying the nftables ruleset');
        }

        let wanRunner: DhcpClientRunner | null = null;
        const lanRunners = new Map<string, DnsmasqRunner>();

        // WAN: run udhcpc on the wan-role interface.
        const reconcileWan = async(): Promise<void> => {
            const wanInterface = await wanConfigClient.fetchWanInterface();

            if (wanInterface === '') {
                if (wanRunner !== null) {
                    wanRunner.stop();
                    wanRunner = null;
                }

                return;
            }

            if (wanRunner === null || wanRunner.iface !== wanInterface) {
                if (wanRunner !== null) {
                    wanRunner.stop();
                }

                wanRunner = new DhcpClientRunner(wanInterface, (lease): void => {
                    Logger.getLogger().info(`Netdevice WAN: lease on ${lease.interface} ${lease.ipv4_address}/${lease.ipv4_prefix} via ${lease.gateway}`);
                    wanReporter.report(lease).catch((): void => {
                        // best-effort
                    });
                });
                wanRunner.start();

                Logger.getLogger().info(`Netdevice WAN: running udhcpc on ${wanInterface}`);
            }
        };

        // LAN: run dnsmasq on the lan-role interface.
        const reconcileLan = async(): Promise<void> => {
            const lanConfigs = await lanConfigClient.fetchConfigs();
            const seen = new Set<string>();

            // One dnsmasq per LAN interface (each its own subnet + lease file, so their
            // leases don't clobber each other).
            for (const lanConfig of lanConfigs) {
                const iface = lanConfig.lanInterface;

                if (iface === '') {
                    continue;
                }

                seen.add(iface);

                // Assign the LAN interface its static IP (up + addr) regardless of whether
                // DHCP is enabled — the interface must own its gateway address for routing
                // and for dnsmasq to bind to the subnet.
                await ensureLanAddress(iface, lanConfig.address, lanConfig.prefix);

                // IPv6 (nat66): assign the ULA /64 + ensure a link-local so dnsmasq's RA
                // can actually be sourced and hit the wire (else clients never get IPv6).
                await ensureLanIpv6(iface, lanConfig.ipv6Mode, lanConfig.ipv6Ula);

                const dnsmasqConfig: DnsmasqConfig = {
                    ...lanConfig,
                    leaseFile: path.join(os.tmpdir(), `ff-lan-${iface}.leases`)
                };

                const existing = lanRunners.get(iface);

                if (existing && existing.matches(dnsmasqConfig)) {
                    continue;
                }

                if (existing) {
                    existing.stop();
                }

                const runner = new DnsmasqRunner(dnsmasqConfig, (leases): void => {
                    lanReporter.report(leases, iface).catch((): void => {
                        // best-effort
                    });
                });
                runner.start();
                lanRunners.set(iface, runner);

                Logger.getLogger().info(`Netdevice LAN: dnsmasq reconciled for ${iface} (enable=${dnsmasqConfig.enable})`);
            }

            // Stop dnsmasq for LAN interfaces that dropped out of the config.
            for (const [iface, runner] of lanRunners) {
                if (!seen.has(iface)) {
                    runner.stop();
                    lanRunners.delete(iface);
                    Logger.getLogger().info(`Netdevice LAN: dnsmasq stopped for removed interface ${iface}`);
                }
            }
        };

        // Discovery: report the live host NIC list so the management UI can offer a
        // NIC select box (a hot-plugged USB NIC shows up within one interval).
        const reconcileInterfaces = async(): Promise<void> => {
            await interfaceReporter.report(HostInterfaceScanner.scan());
        };

        // Netfilter (absorbed from the former ff-netfilter part): pull the resolved
        // router config + program the host nftables ruleset via the native binding.
        const reconcileNetfilter = async(): Promise<void> => {
            const config = await netfilterClient.fetchConfig();

            if (config === null) {
                return;
            }

            netfilterApplier.apply(config);
        };

        const reconcileOnce = async(): Promise<void> => {
            await reconcileInterfaces();
            await reconcileWan();
            await reconcileLan();
            await reconcileNetfilter();
        };

        await reconcileOnce().catch((error: unknown): void => {
            // The first reconcile is best-effort too: a transient failure (backend
            // not ready yet) must not exit the process before the interval below
            // takes over.
            Logger.getLogger().warn('Netdevice initial reconcile failed (will retry next interval)', error);
        });

        // NOT unref'd: this reconcile loop IS the daemon's reason to live. netdevice
        // has no listening server; if the interval were unref'd the process would
        // stay up only while a child (udhcpc/dnsmasq) happens to be running, so a
        // reconcile that spawns nothing (e.g. no roles assigned yet, or a transient
        // config-fetch failure) would drain the event loop and exit → crash-loop.
        // Keeping the timer ref'd lets the part ride out transient failures and
        // self-heal on the next tick. Docker stops it with SIGTERM.
        setInterval((): void => {
            reconcileOnce().catch((error: unknown): void => {
                Logger.getLogger().warn('Netdevice reconcile failed (will retry next interval)', error);
            });
        }, intervalMs);
    }
})().catch((error: unknown): void => {
    console.error('FlyingFish netdevice failed to start:', error);
    process.exit(1);
});