import {Args, Logger} from '@stefanwerfling/figtree';
import {
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
import {buildWanCapabilityManifest} from 'flyingfish_schemas';
import * as fs from 'fs';
import os from 'os';
import path from 'path';
import {Config} from './inc/Config/Config.js';
import {DhcpClientRunner} from './inc/Wan/DhcpClientRunner.js';
import {WanConfigClient} from './inc/Wan/WanConfigClient.js';
import {WanLeaseReporter} from './inc/Wan/WanLeaseReporter.js';

/**
 * Main — the WAN DHCP-client part: enrolls a PKI service identity, self-registers with
 * the Hub, then on an interval learns the WAN interface from the backend, runs udhcpc
 * on it and reports each obtained lease back. No server of its own.
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

    Logger.getLogger().info('Start FlyingFish WAN ...');

    const commonName = tConfig.pki?.commonName ?? `wan@${os.hostname()}`;

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

            Logger.getLogger().info(`WAN PKI identity ready (nodeUid ${identity.nodeUid})`);
        } catch (error) {
            Logger.getLogger().error('WAN PKI enrollment failed (continuing without a node certificate)', error);
        }
    }

    // Announce this node to the Hub registry (part list). Optional.
    if (tConfig.registry) {
        await startHubRegistration(
            tConfig.registry.url,
            tConfig.registry.secret,
            buildWanCapabilityManifest(`wan@${os.hostname()}`),
            {identity: nodeIdentity}
        );
    }

    // Reconcile loop: learn the WAN interface from the Hub and run udhcpc on it,
    // reporting each obtained lease. Restart udhcpc if the WAN interface changes.
    if (tConfig.registry) {
        const configClient = new WanConfigClient(tConfig.registry.url, tConfig.registry.secret);
        const reporter = new WanLeaseReporter(tConfig.registry.url, tConfig.registry.secret);
        const intervalMs = tConfig.wan?.reconcileIntervalMs ?? Config.DEFAULT_RECONCILE_INTERVAL_MS;

        let runner: DhcpClientRunner | null = null;

        const reconcileOnce = async(): Promise<void> => {
            const wanInterface = await configClient.fetchWanInterface();

            if (wanInterface === '') {
                Logger.getLogger().warn('WAN: no WAN interface configured yet (will retry next interval)');

                if (runner !== null) {
                    runner.stop();
                    runner = null;
                }

                return;
            }

            if (runner === null || runner.iface !== wanInterface) {
                if (runner !== null) {
                    runner.stop();
                }

                runner = new DhcpClientRunner(wanInterface, (lease): void => {
                    Logger.getLogger().info(`WAN: lease on ${lease.interface} ${lease.ipv4_address}/${lease.ipv4_prefix} via ${lease.gateway}`);
                    reporter.report(lease).catch((): void => {
                        // best-effort; the next lease event / reconcile retries
                    });
                });
                runner.start();

                Logger.getLogger().info(`WAN: running udhcpc on ${wanInterface}`);
            }
        };

        await reconcileOnce();

        setInterval((): void => {
            reconcileOnce().catch((error: unknown): void => {
                Logger.getLogger().warn('WAN reconcile failed (will retry next interval)', error);
            });
        }, intervalMs).unref();
    }
})().catch((error: unknown): void => {
    console.error('FlyingFish WAN failed to start:', error);
    process.exit(1);
});