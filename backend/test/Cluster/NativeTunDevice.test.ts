/**
 * Unit tests for the NativeTunDevice adapter (Cluster/Mesh epic 9.5.1). The native
 * TUN addon is faked (opening a real device needs CAP_NET_ADMIN and happens only
 * in the privileged datapath container), so these run in the normal baseline.
 * Covered: the read pump turns native recv chunks into onPacket calls and stops at
 * end of stream; writePacket forwards to the native send; close stops the pump and
 * closes the device.
 */
import {NativeTunDevice, TunNativeDevice} from 'flyingfish_core';

const POLL_TIMEOUT_MS = 2000;
const POLL_INTERVAL_MS = 10;

type FakeTun = TunNativeDevice & {sent: Buffer[]; closed: boolean;};

/**
 * A fake native TUN device: `recv` replays scripted packets (null = end of
 * stream), `send` records writes, `close` flips a flag.
 * @param packets - the scripted recv results
 */
const fakeTun = (packets: (Buffer | null)[]): FakeTun => {
    let index = 0;

    const device: FakeTun = {
        ifName: 'fftest0',
        sent: [],
        closed: false,
        recv: (): Promise<Buffer | null> => Promise.resolve(index < packets.length ? packets[index++] : null),
        send: (packet: Buffer): Promise<void> => {
            device.sent.push(Buffer.from(packet));

            return Promise.resolve();
        },
        close: (): Promise<void> => {
            device.closed = true;

            return Promise.resolve();
        }
    };

    return device;
};

/**
 * Resolve once `check` is true or reject after the timeout.
 * @param check - the condition
 */
const waitFor = async(check: () => boolean): Promise<void> => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (!check()) {
        if (Date.now() > deadline) {
            throw new Error('waitFor: timed out');
        }

        // eslint-disable-next-line no-await-in-loop -- sequential poll
        await new Promise((resolve): void => {
            setTimeout(resolve, POLL_INTERVAL_MS);
        });
    }
};

describe('NativeTunDevice', () => {
    test('pumps native recv packets to the onPacket handler until end of stream', async() => {
        const packetA = Buffer.from([0x45, 0x00, 0x00, 0x14]);
        const packetB = Buffer.from([0x45, 0x00, 0x00, 0x28]);
        const tun = new NativeTunDevice(fakeTun([packetA, packetB, null]));

        const received: string[] = [];
        tun.onPacket((packet): void => {
            received.push(Buffer.from(packet).toString('hex'));
        });

        await waitFor((): boolean => received.length === 2);

        expect(received).toEqual([packetA.toString('hex'), packetB.toString('hex')]);
    });

    test('writePacket forwards to the native device send', () => {
        const device = fakeTun([null]);
        const tun = new NativeTunDevice(device);

        tun.writePacket(Uint8Array.from([1, 2, 3, 4]));

        expect(device.sent).toHaveLength(1);
        expect([...device.sent[0]]).toEqual([1, 2, 3, 4]);
    });

    test('close stops the pump and closes the native device', async() => {
        const device = fakeTun([null]);
        const tun = new NativeTunDevice(device);

        await tun.close();

        expect(device.closed).toBe(true);
    });
});