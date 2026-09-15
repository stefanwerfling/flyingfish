import {scheduleJob} from 'node-schedule';
import {Args, Logger, RedisClient, RedisSubscribe} from '@stefanwerfling/figtree';
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
import {buildHimHIPCapabilityManifest} from 'flyingfish_schemas';
import os from 'os';
import {Config} from './inc/Config/Config.js';
import {SchemaFlyingFishArgs} from './inc/Env/Args.js';
import {HimHIP} from './inc/HimHIP.js';

/**
 * Main
 */
(async(): Promise<void> => {
    const config = await Config.getInstance().load2(Args.get(SchemaFlyingFishArgs));

    if (config === null) {
        console.log('Configloader is return empty config, please check your arguments or envirements');
        return;
    }

    // init logger
    Logger.getLogger();

    Logger.getLogger().info('Start FlyingFish HimHip Service ...');

    // Redis mem-db ----------------------------------------------------------------------------------------------------

    if (config.redis && config.redis.url) {
        try {
            const redisSubscribe = RedisSubscribe.getInstance({
                url: config.redis.url,
                password: config.redis.password
            }, true);

            const redisClient = RedisClient.getInstance();
            await redisClient.connect();

            await redisSubscribe.connect();
            await redisSubscribe.registerChannels([
                new HimHIP()
            ]);
        } catch (error) {
            Logger.getLogger().error('Error while connecting to the mem-database', error);
            return;
        }
    }

    // scheduler -------------------------------------------------------------------------------------------------------

    scheduleJob('*/1 * * * *', async() => {
        await HimHIP.update();
    });

    // Node PKI (v2 own-PKI epic 9.4): opt-in enroll + auto-renew of this part's
    // own service certificate, BEFORE Hub registration so the registration can
    // authenticate over mTLS with it. Optional and non-fatal — without pki config
    // the HimHIP service simply runs without a node certificate.
    let nodeIdentity: PkiClientIdentity | undefined;

    if (config.pki) {
        try {
            const store = new PkiNodeFileStore(
                config.pki.storeDir ?? Config.DEFAULT_FF_DIR
            );

            const bootstrapSocket = config.pki.bootstrapSocket;
            const bootstrapTokenProvider = bootstrapSocket
                ? (purpose: PkiCaPurpose): Promise<string> => new PkiBootstrapSocketClient(bootstrapSocket).fetchToken(purpose)
                : undefined;

            const enroller = new PkiNodeEnroller(
                new PkiNodeClient(new PkiNodeHttpTransport(config.pki.url)),
                store,
                {
                    bootstrapToken: config.pki.bootstrapToken,
                    bootstrapTokenProvider: bootstrapTokenProvider,
                    purpose: PkiCaPurpose.service,
                    commonName: config.pki.commonName ?? `himhip@${os.hostname()}`
                }
            );

            const identity = await enroller.ensure();

            nodeIdentity = {cert: identity.certificate, key: identity.privateKey};

            Logger.getLogger().info(`Node PKI identity ready (nodeUid ${identity.nodeUid})`);
        } catch (error) {
            Logger.getLogger().error('Node PKI enrollment failed (continuing without a node certificate)', error);
        }
    }

    // Announce this part to the Hub registry (v2 modular architecture). Optional:
    // without registry config the HimHIP service simply does not self-register. When
    // a node certificate was obtained above, the registration authenticates over
    // mTLS with it instead of relying on the shared secret alone.
    if (config.registry) {
        await startHubRegistration(
            config.registry.url,
            config.registry.secret,
            buildHimHIPCapabilityManifest(`himhip@${os.hostname()}`),
            {identity: nodeIdentity}
        );
    }

})().catch((error: unknown): void => {
    // The logging framework may not be seated yet if boot fails this early,
    // so report to stderr and exit non-zero (lets the container restart).
    console.error('FlyingFish HimHIP service failed to start:', error);
    process.exit(1);
});