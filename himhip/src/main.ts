import {scheduleJob} from 'node-schedule';
import * as path from 'path';
import {Args, Logger, RedisClient} from 'flyingfish_core';
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
            const redisClient = RedisClient.getInstance({
                url: config.redis.url,
                password: config.redis.password
            });

            await redisClient.connect();
            await redisClient.registerChannels([
                new HimHIP()
            ]);
        } catch (error) {
            Logger.getLogger().error('Error while connecting to the mem-database', error);
            return;
        }
    }

    // scheduler -------------------------------------------------------------------------------------------------------

    scheduleJob('*/1 * * * *', async() => {
        await HimHIP.update(
            path.join(
                `${config.server_protocol}://${config.server_host}:${config.server_port}`,
                config.url_path
            ).replace(':/', '://'),
            config.secret
        );
    });

})();