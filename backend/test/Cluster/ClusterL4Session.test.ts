/**
 * Unit tests for the L4 tunnel session state machine (Cluster/Mesh epic 9.5.2),
 * driven entirely by fakes (fake mux channel, fake dialer, fake local streams) so
 * both roles and every edge are covered network-free:
 * - origin: Open then Data pumping, inbound Data→local, inbound Close→teardown,
 *   OpenAck(fail)→teardown;
 * - target: dial, buffering Data until the dial resolves then flushing in order,
 *   OpenAck on success/failure;
 * - streamId parity (low node even, high node odd).
 *
 * Fakes are factory functions (not classes) to keep one class per file.
 */
import {
    ClusterL4DecodedFrame,
    ClusterL4Frame,
    ClusterL4Op,
    ClusterL4Proto,
    ClusterL4Session,
    ClusterL4Target,
    IClusterL4Dialer,
    IClusterL4Stream
} from 'flyingfish_core';

/**
 * A fake mux L4 sub-channel: records outbound frames and can deliver inbound ones.
 */
type FakeChannel = {
    sent: ClusterL4DecodedFrame[];
    send(message: Uint8Array): void;
    onMessage(handler: (message: Uint8Array) => void): void;
    deliver(frame: Uint8Array): void;
};

/**
 * A fake local endpoint (ingress or dialed socket) with test controls.
 */
type FakeStream = IClusterL4Stream & {
    written: Uint8Array[];
    isClosed(): boolean;
    emit(data: Uint8Array): void;
    end(): void;
};

/**
 * A fake dialer whose dial() resolves/rejects on command, capturing targets.
 */
type FakeDialer = IClusterL4Dialer & {
    targets: ClusterL4Target[];
    settle(): FakeStream;
    fail(): void;
};

/**
 * Build a fake mux sub-channel.
 */
const createChannel = (): FakeChannel => {
    const sent: ClusterL4DecodedFrame[] = [];
    let handler: ((message: Uint8Array) => void) | null = null;

    return {
        sent: sent,
        send: (message: Uint8Array): void => {
            const decoded = ClusterL4Frame.decode(message);

            if (decoded !== null) {
                sent.push(decoded);
            }
        },
        onMessage: (next: (message: Uint8Array) => void): void => {
            handler = next;
        },
        deliver: (frame: Uint8Array): void => {
            if (handler !== null) {
                handler(frame);
            }
        }
    };
};

/**
 * Build a fake local stream.
 */
const createStream = (): FakeStream => {
    const written: Uint8Array[] = [];
    let closed = false;
    let dataHandler: ((data: Uint8Array) => void) | null = null;
    let closeHandler: (() => void) | null = null;

    return {
        written: written,
        write: (data: Uint8Array): void => {
            written.push(data);
        },
        onData: (handler: (data: Uint8Array) => void): void => {
            dataHandler = handler;
        },
        onClose: (handler: () => void): void => {
            closeHandler = handler;
        },
        close: (): void => {
            closed = true;
        },
        isClosed: (): boolean => closed,
        emit: (data: Uint8Array): void => {
            if (dataHandler !== null) {
                dataHandler(data);
            }
        },
        end: (): void => {
            if (closeHandler !== null) {
                closeHandler();
            }
        }
    };
};

/**
 * Build a fake dialer.
 */
const createDialer = (): FakeDialer => {
    const targets: ClusterL4Target[] = [];
    let resolveDial: ((stream: IClusterL4Stream) => void) | null = null;
    let rejectDial: ((error: Error) => void) | null = null;

    return {
        targets: targets,
        dial: async(target: ClusterL4Target): Promise<IClusterL4Stream> => {
            targets.push(target);

            return new Promise<IClusterL4Stream>((resolve, reject): void => {
                resolveDial = resolve;
                rejectDial = reject;
            });
        },
        settle: (): FakeStream => {
            const stream = createStream();

            if (resolveDial !== null) {
                resolveDial(stream);
            }

            return stream;
        },
        fail: (): void => {
            if (rejectDial !== null) {
                rejectDial(new Error('dial failed'));
            }
        }
    };
};

const target: ClusterL4Target = {proto: ClusterL4Proto.Tcp, host: '10.0.0.9', port: 5000};

/**
 * Let a settled/rejected dial promise run its continuation.
 */
const flush = async(): Promise<void> => {
    await new Promise((resolve): void => {
        setTimeout(resolve, 0);
    });
};

describe('ClusterL4Session (origin role)', () => {
    test('openStream sends Open then pumps local bytes as Data and Close on end', () => {
        const channel = createChannel();
        const session = new ClusterL4Session(channel as never, createDialer(), true);
        const local = createStream();

        session.openStream(target, local);

        // first frame is Open with the target
        expect(channel.sent[0]).toEqual({op: ClusterL4Op.Open, streamId: 2, target: target});
        expect(session.streamCount()).toBe(1);

        local.emit(new Uint8Array([1, 2, 3]));
        expect(channel.sent[1]).toEqual({op: ClusterL4Op.Data, streamId: 2, data: new Uint8Array([1, 2, 3])});

        local.end();
        expect(channel.sent[2]).toEqual({op: ClusterL4Op.Close, streamId: 2});
        expect(session.streamCount()).toBe(0);
    });

    test('inbound Data is written to the local endpoint; inbound Close tears it down', () => {
        const channel = createChannel();
        const session = new ClusterL4Session(channel as never, createDialer(), true);
        const local = createStream();

        session.openStream(target, local);
        channel.deliver(ClusterL4Frame.encodeData(2, new Uint8Array([9, 9])));
        expect(local.written.map((w) => Array.from(w))).toEqual([[9, 9]]);

        channel.deliver(ClusterL4Frame.encodeClose(2));
        expect(local.isClosed()).toBe(true);
        expect(session.streamCount()).toBe(0);
    });

    test('OpenAck(fail) tears the local endpoint down', () => {
        const channel = createChannel();
        const session = new ClusterL4Session(channel as never, createDialer(), true);
        const local = createStream();

        session.openStream(target, local);
        channel.deliver(ClusterL4Frame.encodeOpenAck(2, false));

        expect(local.isClosed()).toBe(true);
        expect(session.streamCount()).toBe(0);
    });

    test('low node allocates even streamIds, high node odd, stepping by two', () => {
        const chLow = createChannel();
        const low = new ClusterL4Session(chLow as never, createDialer(), true);
        low.openStream(target, createStream());
        low.openStream(target, createStream());
        expect(chLow.sent.filter((f) => f.op === ClusterL4Op.Open).map((f) => f.streamId)).toEqual([2, 4]);

        const chHigh = createChannel();
        const high = new ClusterL4Session(chHigh as never, createDialer(), false);
        high.openStream(target, createStream());
        high.openStream(target, createStream());
        expect(chHigh.sent.filter((f) => f.op === ClusterL4Op.Open).map((f) => f.streamId)).toEqual([1, 3]);
    });
});

describe('ClusterL4Session (target role)', () => {
    test('inbound Open dials, buffers early Data, then OpenAck(ok) and flushes in order', async() => {
        const channel = createChannel();
        const dialer = createDialer();
        const session = new ClusterL4Session(channel as never, dialer, false);

        // peer (low node) opens stream 2 toward us
        channel.deliver(ClusterL4Frame.encodeOpen(2, target));
        expect(dialer.targets).toEqual([target]);
        expect(session.streamCount()).toBe(1);

        // Data arrives before the dial resolves — must be buffered, not lost
        channel.deliver(ClusterL4Frame.encodeData(2, new Uint8Array([1])));
        channel.deliver(ClusterL4Frame.encodeData(2, new Uint8Array([2])));

        const local = dialer.settle();
        await flush();

        // OpenAck(ok) is sent, and the buffered Data is flushed in order
        expect(channel.sent).toContainEqual({op: ClusterL4Op.OpenAck, streamId: 2, ok: true});
        expect(local.written.map((w) => Array.from(w))).toEqual([[1], [2]]);

        // subsequent inbound Data flows straight through
        channel.deliver(ClusterL4Frame.encodeData(2, new Uint8Array([3])));
        expect(local.written.map((w) => Array.from(w))).toEqual([[1], [2], [3]]);

        // and bytes read from the dialed socket go back as Data
        local.emit(new Uint8Array([7]));
        expect(channel.sent).toContainEqual({op: ClusterL4Op.Data, streamId: 2, data: new Uint8Array([7])});
    });

    test('a failed dial answers OpenAck(fail) and opens no stream', async() => {
        const channel = createChannel();
        const dialer = createDialer();
        const session = new ClusterL4Session(channel as never, dialer, false);

        channel.deliver(ClusterL4Frame.encodeOpen(2, target));
        dialer.fail();
        await flush();

        expect(channel.sent).toContainEqual({op: ClusterL4Op.OpenAck, streamId: 2, ok: false});
        expect(session.streamCount()).toBe(0);
    });
});