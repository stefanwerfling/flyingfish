import minimist from 'minimist';
import {scheduleJob} from 'node-schedule';
import {HimHIP} from './inc/HimHIP';

/**
 * Main
 */
(async(): Promise<void> => {
    const argv = minimist(process.argv.slice(2));

    if (argv.reciverurl && argv.secure) {
        scheduleJob('*/1 * * * *', async() => {
            await HimHIP.update(argv.reciverurl, argv.secure);
        });
    } else {
        console.error('Please set reciver and secure!');
    }
})();