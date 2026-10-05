/**
 * Unit tests for the backend HimHIP in-process store.
 *
 * HimHIP is now a plain static store for this node's host/gateway facts. The
 * facts are reported by the netdevice part over HTTP (POST /json/router/host-info,
 * schema-validated at the route layer) and land here via setData(); consumers
 * read getData() or subscribe with registerEvent(). The former Redis pub/sub
 * receiver (with its own schema validation) was removed. These tests cover the
 * store's set/get and event-fan-out semantics.
 */
import {HimHIPData} from 'flyingfish_schemas';
import {HimHIP} from '../../src/inc/HimHIP/HimHIP.js';

const sampleData = (): HimHIPData => {
    return {
        gatewaymac: 'aa:bb:cc:dd:ee:ff',
        network: '10.103.0.0/16',
        gateway: '10.103.0.1',
        interface: 'eth0',
        hostip: '10.103.0.3'
    };
};

describe('HimHIP store', () => {
    beforeEach(() => {
        HimHIP.setData(null);
    });

    test('setData stores host data readable via getData', () => {
        HimHIP.setData(sampleData());

        expect(HimHIP.getData()).toEqual(sampleData());
    });

    test('setData(null) clears the stored host data', () => {
        HimHIP.setData(sampleData());
        HimHIP.setData(null);

        expect(HimHIP.getData()).toBeNull();
    });

    test('registered events fire on setData', () => {
        let received: HimHIPData | null = null;
        HimHIP.registerEvent((data) => {
            received = data;
        });

        HimHIP.setData(sampleData());

        expect(received).toEqual(sampleData());
    });
});
