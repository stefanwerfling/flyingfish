/**
 * End-to-end tests for the L4 tunnel (Cluster/Mesh epic 9.5.2) over real loopback
 * TCP: a client connects to an ingress TCP listener, its bytes travel as L4 frames
 * over a real ClusterPeerMux pair to an egress session that dials a real TCP echo
 * server, and the echo comes back the same way. A second test proves an L3 overlay
 * packet and an L4 stream coexist on the one muxed peer link. Loopback only.
 */
import {AddressInfo, createConnection, createServer, Server, Socket} from 'node:net';
import {
    ClusterDatapath,
    ClusterL4Proto,
    ClusterL4Session,
    ClusterL4TcpDialer,
    ClusterL4TcpListener,
    ClusterMuxKind,
    ClusterPeerChannel,
    ClusterPeerMux,
    ClusterProxyProtocolV2,
    ClusterRouteTable,
    IClusterL4Dialer,
    IClusterL4Stream,
    IClusterTunDevice,
    Ipv4Packet
} from 'flyingfish_core';

const POLL_TIMEOUT_MS = 3000;
const POLL_INTERVAL_MS = 20;

/**
 * A fake TUN device recording packets written back to the kernel.
 */
class FakeTunDevice implements IClusterTunDevice {

    public readonly written: Uint8Array[] = [];

    /**
     * @inheritDoc
     */
    public onPacket(): void {
        // no outbound packets are emitted in these tests
    }

    /**
     * @inheritDoc
     */
    public writePacket(packet: Uint8Array): void {
        this.written.push(packet);
    }

    /**
     * @inheritDoc
     */
    public async close(): Promise<void> {
        // nothing to release
    }

}

/**
 * A fake peer channel wired to a peer so two form a bidirectional link the muxes
 * ride. A factory (not a class) to keep one class per file.
 */
type FakeChannel = {
    setPeer(peer: FakeChannel): void;
    send(message: Uint8Array): void;
    onMessage(handler: (message: Uint8Array) => void): void;
    onClose(): void;
    deliver(message: Uint8Array): void;
};

/**
 * Build a fake peer channel (peer captured by closure to avoid `this`).
 */
const createChannel = (): FakeChannel => {
    let handler: ((message: Uint8Array) => void) | null = null;
    let peer: FakeChannel | null = null;

    return {
        setPeer: (next: FakeChannel): void => {
            peer = next;
        },
        send: (message: Uint8Array): void => {
            // copy so a later buffer mutation can't affect the delivered frame
            if (peer !== null) {
                peer.deliver(new Uint8Array(message));
            }
        },
        onMessage: (next: (message: Uint8Array) => void): void => {
            handler = next;
        },
        onClose: (): void => {
            // unused here
        },
        deliver: (message: Uint8Array): void => {
            if (handler !== null) {
                handler(message);
            }
        }
    };
};

/**
 * Wire two fake channels into a pair and wrap each in a mux.
 */
const buildMuxPair = (): {muxA: ClusterPeerMux; muxB: ClusterPeerMux;} => {
    const chanA = createChannel();
    const chanB = createChannel();
    chanA.setPeer(chanB);
    chanB.setPeer(chanA);

    return {
        muxA: new ClusterPeerMux(chanA as unknown as ClusterPeerChannel),
        muxB: new ClusterPeerMux(chanB as unknown as ClusterPeerChannel)
    };
};

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

/**
 * Build a minimal IPv4 packet with the given source/destination.
 * @param source - dotted-quad source
 * @param destination - dotted-quad destination
 */
const buildIpv4 = (source: string, destination: string): Uint8Array => {
    const packet = new Uint8Array(Ipv4Packet.MIN_HEADER_BYTES);
    packet[0] = 0x45;
    source.split('.').forEach((part, index) => {
        packet[12 + index] = parseInt(part, 10);
    });
    destination.split('.').forEach((part, index) => {
        packet[16 + index] = parseInt(part, 10);
    });

    return packet;
};

/**
 * A dialer that always rejects — the origin side never dials.
 */
const noDial: IClusterL4Dialer = {
    dial: async(): Promise<IClusterL4Stream> => {
        throw new Error('origin does not dial');
    }
};

describe('ClusterL4 tunnel end to end (real loopback TCP over a mux pair)', () => {
    let echo: Server;
    let echoPort: number;

    beforeAll(async() => {
        echo = createServer((socket: Socket): void => {
            socket.on('data', (chunk: Buffer): void => {
                socket.write(chunk);
            });
        });

        await new Promise<void>((resolve): void => {
            echo.listen(0, '127.0.0.1', (): void => resolve());
        });

        echoPort = (echo.address() as AddressInfo).port;
    });

    afterAll(async() => {
        await new Promise<void>((resolve): void => {
            echo.close((): void => resolve());
        });
    });

    test('a client byte stream is tunnelled to the egress target and echoed back', async() => {
        const {muxA, muxB} = buildMuxPair();

        // origin side (node "A", low): opens streams, never dials
        const origin = new ClusterL4Session(muxA.channel(ClusterMuxKind.L4), noDial, true);
        // egress side (node "B", high): dials the real echo server over TCP
        const egress = new ClusterL4Session(muxB.channel(ClusterMuxKind.L4), new ClusterL4TcpDialer(), false);

        // ingress TCP listener maps every accepted connection to a tunnelled stream
        const listener = new ClusterL4TcpListener((stream: IClusterL4Stream): void => {
            origin.openStream({proto: ClusterL4Proto.Tcp, host: '127.0.0.1', port: echoPort}, stream);
        });
        const ingressPort = await listener.listen(0, '127.0.0.1');

        // a real client connects to the ingress and sends bytes
        const received: Buffer[] = [];
        const client = createConnection({host: '127.0.0.1', port: ingressPort});
        client.on('data', (chunk: Buffer): void => {
            received.push(chunk);
        });

        await new Promise<void>((resolve): void => {
            client.on('connect', (): void => resolve());
        });

        client.write(Buffer.from('hello tunnel'));

        await waitFor((): boolean => Buffer.concat(received).toString('utf8') === 'hello tunnel');
        expect(Buffer.concat(received).toString('utf8')).toBe('hello tunnel');

        client.destroy();
        origin.close();
        egress.close();
        await listener.close();
    });
});

describe('ClusterL4 tunnel coexists with the L3 datapath on one muxed link', () => {
    test('an L3 packet and an L4 stream both traverse the same peer link', async() => {
        const {muxA, muxB} = buildMuxPair();

        // L3: datapath on B writes inbound packets to its TUN
        const tunB = new FakeTunDevice();
        const datapathB = new ClusterDatapath(tunB, new ClusterRouteTable(), () => undefined);
        datapathB.attachPeer(muxB.channel(ClusterMuxKind.Packet));

        // L4: egress writes tunnelled bytes into this captured endpoint
        const egressWritten: Uint8Array[] = [];
        const egressEndpoint: IClusterL4Stream = {
            write: (data: Uint8Array): void => {
                egressWritten.push(data);
            },
            onData: (): void => {
                // egress produces no bytes back in this test
            },
            onClose: (): void => {
                // not exercised
            },
            close: (): void => {
                // not exercised
            }
        };
        const egress = new ClusterL4Session(muxB.channel(ClusterMuxKind.L4), {
            dial: async(): Promise<IClusterL4Stream> => egressEndpoint
        }, false);
        const origin = new ClusterL4Session(muxA.channel(ClusterMuxKind.L4), noDial, true);

        // send an L3 packet A→B over the Packet sub-channel
        const packet = buildIpv4('10.42.0.1', '10.42.0.2');
        muxA.channel(ClusterMuxKind.Packet).send(packet);

        // open an L4 stream A→B whose ingress endpoint emits one byte immediately
        const ingressEndpoint: IClusterL4Stream = {
            write: (): void => {
                // no bytes come back in this test
            },
            onData: (handler: (data: Uint8Array) => void): void => {
                handler(new Uint8Array([0xab]));
            },
            onClose: (): void => {
                // not exercised
            },
            close: (): void => {
                // not exercised
            }
        };
        origin.openStream({proto: ClusterL4Proto.Tcp, host: '127.0.0.1', port: 9}, ingressEndpoint);

        await waitFor((): boolean => egressWritten.length === 1);

        // L3 packet reached B's TUN
        expect(tunB.written).toHaveLength(1);
        expect(Buffer.from(tunB.written[0]).equals(Buffer.from(packet))).toBe(true);
        // L4 byte reached B's egress endpoint
        expect(Array.from(egressWritten[0])).toEqual([0xab]);

        origin.close();
        egress.close();
    });
});

describe('ClusterL4 tunnel preserves the client IP with PROXY protocol v2 (9.5.3)', () => {
    let backend: Server;
    let backendPort: number;
    let firstBytes: Buffer;

    beforeAll(async() => {
        // a backend that captures the raw bytes of the one connection it accepts
        backend = createServer((socket: Socket): void => {
            const chunks: Buffer[] = [];
            socket.on('data', (chunk: Buffer): void => {
                chunks.push(chunk);
                firstBytes = Buffer.concat(chunks);
            });
        });

        await new Promise<void>((resolve): void => {
            backend.listen(0, '127.0.0.1', (): void => resolve());
        });

        backendPort = (backend.address() as AddressInfo).port;
        firstBytes = Buffer.alloc(0);
    });

    afterAll(async() => {
        await new Promise<void>((resolve): void => {
            backend.close((): void => resolve());
        });
    });

    test('the backend receives a PROXY v2 header carrying the real client, then the payload', async() => {
        const {muxA, muxB} = buildMuxPair();

        const origin = new ClusterL4Session(muxA.channel(ClusterMuxKind.L4), noDial, true);
        const egress = new ClusterL4Session(muxB.channel(ClusterMuxKind.L4), new ClusterL4TcpDialer(), false);

        // ingress with proxyProtocol on: carry the accepted socket's endpoints as clientInfo
        const listener = new ClusterL4TcpListener((stream: IClusterL4Stream, endpoints): void => {
            const clientInfo = endpoints === undefined ? undefined : {
                sourceHost: endpoints.source.host,
                sourcePort: endpoints.source.port,
                destHost: endpoints.destination.host,
                destPort: endpoints.destination.port
            };

            origin.openStream({proto: ClusterL4Proto.Tcp, host: '127.0.0.1', port: backendPort}, stream, clientInfo);
        });
        const ingressPort = await listener.listen(0, '127.0.0.1');

        const client = createConnection({host: '127.0.0.1', port: ingressPort});
        await new Promise<void>((resolve): void => {
            client.on('connect', (): void => resolve());
        });

        const clientPort = client.localPort ?? 0;
        client.write(Buffer.from('PING'));

        // header (28 bytes for TCP4) + the 4-byte payload
        await waitFor((): boolean => firstBytes.length >= 28 + 4);

        const header = ClusterProxyProtocolV2.decode(new Uint8Array(firstBytes));
        expect(header).not.toBeNull();
        expect(header!.source.host).toBe('127.0.0.1');
        expect(header!.source.port).toBe(clientPort);
        expect(header!.destination.host).toBe('127.0.0.1');
        expect(header!.destination.port).toBe(ingressPort);

        // the tunnelled payload follows the header untouched
        expect(firstBytes.subarray(28).toString('utf8')).toBe('PING');

        client.destroy();
        origin.close();
        egress.close();
        await listener.close();
    });
});