import * as process from 'process';
import {Tun} from 'tuntap2/dist/index.js';
import {IP} from './inc/Decode/IP.js';
import {IPv4} from './inc/Decode/IPv4.js';
import {VpnServer} from './inc/VpnServer.js';

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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const ippacket = IP.decodeIP(buf);
            console.log(ippacket);

            if (ippacket instanceof IPv4) {
                console.log(ippacket.getSourceAddress().toString());
                console.log(ippacket.getDestinationAddress().toString());
            }
        });
        tun.isUp = true;
        // tun.release();

        console.log('success');
    } catch (e) {
        console.log('error: ', e);
        process.exit(0);
    }
})();