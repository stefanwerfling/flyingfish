import {scheduleJob} from 'node-schedule';
import * as path from 'path';
import {Args, Logger} from 'flyingfish_core';
import {Config} from './inc/Config/Config.js';
import {SchemaFlyingFishArgs} from './inc/Env/Args.js';
import {HimHIP} from './inc/HimHIP.js';

/**
 * Main
 */
(async(): Promise<void> => {
    const config = await Config.getInstance().load(Args.get(SchemaFlyingFishArgs));

    if (config === null) {
        console.log('Configloader is return empty config, please check your arguments or envirements');
        return;
    }

    // init logger
    Logger.getLogger();

    Logger.getLogger().info('Start FlyingFish HimHip Service ...');

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