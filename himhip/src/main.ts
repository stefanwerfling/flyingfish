import {scheduleJob} from 'node-schedule';
import {Args, Logger, RedisClient, RedisSubscribe} from 'figtree';
import {registerWithHub} from 'flyingfish_core';
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

    // Announce this part to the Hub registry (v2 modular architecture). Optional:
    // without registry config the HimHIP service simply does not self-register.
    if (config.registry) {
        await registerWithHub(
            config.registry.url,
            config.registry.secret,
            buildHimHIPCapabilityManifest(`himhip@${os.hostname()}`)
        );
    }

})().catch((error: unknown): void => {
    // The logging framework may not be seated yet if boot fails this early,
    // so report to stderr and exit non-zero (lets the container restart).
    console.error('FlyingFish HimHIP service failed to start:', error);
    process.exit(1);
});