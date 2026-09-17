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
import {LanConfigClient} from './inc/Lan/LanConfigClient.js';
import {HostInterfaceScanner} from './inc/Discovery/HostInterfaceScanner.js';
import {InterfaceReporter} from './inc/Discovery/InterfaceReporter.js';
import {NetfilterApplier} from './inc/Netfilter/NetfilterApplier.js';
import {NetfilterConfigClient} from './inc/Netfilter/NetfilterConfigClient.js';

const LEASE_FILE = path.join(os.tmpdir(), 'ff-lan-dnsmasq.leases');

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

    // Announce this node to the Hub registry (part list). Optional.
    if (tConfig.registry) {
        await startHubRegistration(
            tConfig.registry.url,
            tConfig.registry.secret,
            buildNetdeviceCapabilityManifest(`netdevice@${os.hostname()}`),
            {identity: nodeIdentity}
        );
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
        let lanRunner: DnsmasqRunner | null = null;

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
            const lanConfig = await lanConfigClient.fetchConfig();

            if (lanConfig === null) {
                return;
            }

            const dnsmasqConfig: DnsmasqConfig = {...lanConfig, leaseFile: LEASE_FILE};

            if (lanRunner !== null && lanRunner.matches(dnsmasqConfig)) {
                return;
            }

            if (lanRunner !== null) {
                lanRunner.stop();
            }

            const iface = dnsmasqConfig.lanInterface;
            lanRunner = new DnsmasqRunner(dnsmasqConfig, (leases): void => {
                lanReporter.report(leases, iface).catch((): void => {
                    // best-effort
                });
            });
            lanRunner.start();

            Logger.getLogger().info(`Netdevice LAN: dnsmasq reconciled for ${iface === '' ? '(no interface)' : iface} (enable=${dnsmasqConfig.enable})`);
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

        await reconcileOnce();

        setInterval((): void => {
            reconcileOnce().catch((error: unknown): void => {
                Logger.getLogger().warn('Netdevice reconcile failed (will retry next interval)', error);
            });
        }, intervalMs).unref();
    }
})().catch((error: unknown): void => {
    console.error('FlyingFish netdevice failed to start:', error);
    process.exit(1);
});