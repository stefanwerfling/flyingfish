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
import {buildNetfilterCapabilityManifest} from 'flyingfish_schemas';
import * as fs from 'fs';
import os from 'os';
import path from 'path';
import {Config} from './inc/Config/Config.js';
import {NetfilterApplier} from './inc/Netfilter/NetfilterApplier.js';
import {NetfilterConfigClient} from './inc/Netfilter/NetfilterConfigClient.js';

/**
 * Main — the netfilter/NAT router part: enrolls a PKI service identity, self-registers
 * with the Hub, then on an interval pulls the resolved router config from the backend,
 * builds the nftables ruleset + forwarding sysctls and applies them to the host. No
 * server of its own; it is a pull+apply reconciler.
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

    Logger.getLogger().info('Start FlyingFish Netfilter ...');

    const commonName = tConfig.pki?.commonName ?? `netfilter@${os.hostname()}`;

    // Node PKI (own-PKI epic 9.4): enroll + auto-renew this node's own service
    // certificate for the mTLS Hub identity. Optional and non-fatal.
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

            Logger.getLogger().info(`Netfilter PKI identity ready (nodeUid ${identity.nodeUid})`);
        } catch (error) {
            Logger.getLogger().error('Netfilter PKI enrollment failed (continuing without a node certificate)', error);
        }
    }

    // Announce this node to the Hub registry (part list). Optional.
    if (tConfig.registry) {
        await startHubRegistration(
            tConfig.registry.url,
            tConfig.registry.secret,
            buildNetfilterCapabilityManifest(`netfilter@${os.hostname()}`),
            {identity: nodeIdentity}
        );
    }

    // Reconcile loop: pull the resolved config, build + apply the ruleset. Needs the
    // registry (that is where the resolved config lives). Best-effort each interval.
    if (tConfig.registry) {
        const client = new NetfilterConfigClient(tConfig.registry.url, tConfig.registry.secret);
        const applier = new NetfilterApplier();
        const intervalMs = tConfig.netfilter?.reconcileIntervalMs ?? Config.DEFAULT_RECONCILE_INTERVAL_MS;

        if (!applier.isAvailable()) {
            Logger.getLogger().warn('Netfilter: native binding unavailable — running config-only (no ruleset applied)');
        }

        const reconcileOnce = async(): Promise<void> => {
            const config = await client.fetchConfig();

            if (config === null) {
                Logger.getLogger().warn('Netfilter: no config from the Hub yet (will retry next interval)');

                return;
            }

            applier.apply(config);
        };

        await reconcileOnce();

        setInterval((): void => {
            reconcileOnce().catch((error: unknown): void => {
                Logger.getLogger().warn('Netfilter reconcile failed (will retry next interval)', error);
            });
        }, intervalMs).unref();

        Logger.getLogger().info(`Netfilter reconcile loop running (every ${intervalMs}ms)`);
    }
})().catch((error: unknown): void => {
    console.error('FlyingFish netfilter failed to start:', error);
    process.exit(1);
});