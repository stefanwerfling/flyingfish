import * as dotenv from 'dotenv';
import {Logger} from 'flyingfish_core';
import {Config} from './src/inc/Config/Config';

export default async(): Promise<any> => {
    dotenv.config({path: './../.env'});

    console.log('Loaded Env.');

    await Config.getInstance().load(null, true);
    const config = Config.getInstance().get();

    if (config === null) {
        console.log('Configloader is return empty config, please check your .env file');
        return;
    }

    if (config) {
        if (typeof config.logging === 'undefined') {
            config.logging = {};
        }

        config.logging.dirname = '/tmp/';

        Config.getInstance().set(config);

        Logger.getLogger();
    }
};