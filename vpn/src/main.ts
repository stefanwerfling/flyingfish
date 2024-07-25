import * as process from 'process';
import {Tun} from 'tuntap2';
import {IP} from './inc/Decode/IP.js';
import {IPv4} from './inc/Decode/IPv4.js';
import {Rohc} from 'node-rohc';

/**
 * Main
 */
(async(): Promise<void> => {
    try {
        const tun = new Tun();
        const rohc = new Rohc();

        tun.mtu = 1400;
        tun.ipv4 = '4.3.2.1/24';
        tun.on('data', (buf) => {
            const cmpBuf = rohc.compress(new Uint8Array(buf));
            const ippacket = IP.decodeIP(buf);
            console.log(ippacket);
            console.log(cmpBuf);

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