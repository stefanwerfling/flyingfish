import * as process from 'process';
import {Tun} from 'tuntap2/dist';
import {VpnServer} from './inc/VpnServer';

/**
 * Main
 */
(async(): Promise<void> => {
    try {
        const server = new VpnServer({});
        server.listen();

        const tun = new Tun();

        tun.mtu = 1400;
        tun.ipv4 = '4.3.2.1/24';
        tun.on('data', (buf) => {
            console.log('received:', buf);
        });
        tun.isUp = true;
        // tun.release();

        console.log('success');
    } catch (e) {
        console.log('error: ', e);
        process.exit(0);
    }
})();