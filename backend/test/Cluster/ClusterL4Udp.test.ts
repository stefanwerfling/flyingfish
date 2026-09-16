/**
 * Tests for the UDP tunnel egress path (Cluster/Mesh epic 9.5.2, UDP tunneling):
 * the real datagram dialer/stream over loopback UDP (datagram out to a target echo
 * server and back), the composite dialer routing by proto, and the idle-timeout
 * teardown of an idle UDP flow. Loopback only.
 */
import {AddressInfo, createSocket, Socket} from 'node:dgram';
import {
    ClusterL4CompositeDialer,
    ClusterL4Proto,
    ClusterL4Target,
    ClusterL4UdpDialer,
    ClusterL4UdpStream,
    IClusterL4Dialer,
    IClusterL4Stream
} from 'flyingfish_core';

const POLL_TIMEOUT_MS = 3000;
const POLL_INTERVAL_MS = 20;

/**
 * Resolve once `check` is true, or reject after the timeout.
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

describe('ClusterL4UdpDialer + ClusterL4UdpStream (real loopback UDP)', () => {
    let echo: Socket;
    let echoPort: number;

    beforeAll(async() => {
        echo = createSocket('udp4');
        echo.on('message', (message: Buffer, rinfo): void => {
            echo.send(message, rinfo.port, rinfo.address);
        });

        await new Promise<void>((resolve): void => {
            echo.bind(0, '127.0.0.1', (): void => resolve());
        });

        echoPort = (echo.address() as AddressInfo).port;
    });

    afterAll(async() => {
        await new Promise<void>((resolve): void => {
            echo.close((): void => resolve());
        });
    });

    test('a datagram is dialed to the target and echoed back', async() => {
        const stream = await new ClusterL4UdpDialer().dial({proto: ClusterL4Proto.Udp, host: '127.0.0.1', port: echoPort});

        const got: string[] = [];
        stream.onData((data: Uint8Array): void => {
            got.push(Buffer.from(data).toString('utf8'));
        });

        stream.write(Buffer.from('ping-udp'));

        await waitFor((): boolean => got.length === 1);
        expect(got[0]).toBe('ping-udp');

        stream.close();
    });

    test('the UDP dialer rejects a non-UDP target', async() => {
        await expect(new ClusterL4UdpDialer().dial({proto: ClusterL4Proto.Tcp, host: '127.0.0.1', port: echoPort}))
        .rejects.toThrow(/only UDP/u);
    });

    test('an idle UDP flow tears itself down after the idle timeout', async() => {
        const socket = createSocket('udp4');
        await new Promise<void>((resolve): void => {
            socket.connect(echoPort, '127.0.0.1', (): void => resolve());
        });

        const stream = new ClusterL4UdpStream(socket, 40);
        let closed = false;
        stream.onClose((): void => {
            closed = true;
        });

        await waitFor((): boolean => closed);
        expect(closed).toBe(true);
    });
});

describe('ClusterL4CompositeDialer', () => {
    test('routes the dial to the UDP or TCP dialer by target proto', async() => {
        const tcpTargets: ClusterL4Target[] = [];
        const udpTargets: ClusterL4Target[] = [];
        const stub: IClusterL4Stream = {
            write: (): void => undefined,
            onData: (): void => undefined,
            onClose: (): void => undefined,
            close: (): void => undefined
        };
        const fakeTcp: IClusterL4Dialer = {dial: async(target): Promise<IClusterL4Stream> => {
            tcpTargets.push(target);

            return stub;
        }};
        const fakeUdp: IClusterL4Dialer = {dial: async(target): Promise<IClusterL4Stream> => {
            udpTargets.push(target);

            return stub;
        }};

        const composite = new ClusterL4CompositeDialer(fakeTcp, fakeUdp);
        await composite.dial({proto: ClusterL4Proto.Tcp, host: '10.0.0.1', port: 80});
        await composite.dial({proto: ClusterL4Proto.Udp, host: '10.0.0.9', port: 53});

        expect(tcpTargets.map((target) => target.port)).toEqual([80]);
        expect(udpTargets.map((target) => target.port)).toEqual([53]);
    });
});