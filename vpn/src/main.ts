import * as process from 'process';
import {Tun} from 'tuntap2/dist';

/**
 * Main
 */
(async(): Promise<void> => {
    try {
        const tun = new Tun();

        tun.isUp = true;
        tun.ipv4 = '4.3.2.0/24';
        console.log('success');
    } catch (e) {
        console.log('error: ', e);
        process.exit(0);
    }
})();