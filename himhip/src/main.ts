import {scheduleJob} from 'node-schedule';
import * as path from 'path';
import {Config} from './inc/Config/Config.js';
import {Args} from './inc/Env/Args.js';
import {HimHIP} from './inc/HimHIP.js';

/**
 * Main
 */
(async(): Promise<void> => {
    const config = await Config.load(Args.get());

    if (config === null) {
        console.log(`Configloader is return empty config, please check your arguments or envirements`);
        return;
    }

    Config.set(config);

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