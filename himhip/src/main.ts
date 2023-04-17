import {scheduleJob} from 'node-schedule';
import {Args} from './inc/Env/Args.js';
import {HimHIP} from './inc/HimHIP.js';

/**
 * Main
 */
(async(): Promise<void> => {
    const argv = Args.get();

    if (argv.reciverurl && argv.secure) {
        scheduleJob('*/1 * * * *', async() => {
            await HimHIP.update(argv.reciverurl, argv.secure);
        });
    } else {
        console.error('Please set reciver and secure!');
    }
})();