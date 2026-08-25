/**
 * Unit tests for the backend HimHIP Redis-IPC receiver (phase 3, IPC).
 *
 * HimHIP is the RedisChannel the backend subscribes to (HIMHIP_UPDATE_RES): it
 * validates the incoming host-network data and publishes it to registered
 * listeners. These tests cover that receive path directly (network-free - no
 * Redis needed, the channel just calls listen()).
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

describe('HimHIP receiver (Redis IPC)', () => {
    beforeEach(() => {
        HimHIP.setData(null);
    });

    test('listen stores valid host data', async() => {
        await new HimHIP().listen(sampleData());

        expect(HimHIP.getData()).toEqual(sampleData());
    });

    test('listen ignores schema-invalid data', async() => {
        // Missing the required string fields -> must not overwrite the state.
        await new HimHIP().listen({gatewaymac: 'aa:bb:cc:dd:ee:ff'} as unknown as HimHIPData);

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