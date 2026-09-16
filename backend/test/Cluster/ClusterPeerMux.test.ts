/**
 * Unit tests for the peer-link multiplexer of the cluster mesh (Cluster/Mesh epic
 * 9.5.2). A single authenticated peer channel carries several logical sub-channels,
 * each tagged with a one-byte kind, so the L3 datapath and the L4 tunnel share one
 * link. Covers kind tagging/stripping, isolation between kinds, dropping of empty
 * or unknown-kind messages, and close passthrough — all against a fake in-memory
 * channel pair (network-free).
 */
import {ClusterMuxKind, ClusterPeerChannel, ClusterPeerMux} from 'flyingfish_core';

/**
 * A fake {@link ClusterPeerChannel}: `send` hands the raw bytes to a wired peer's
 * inbound handler, so two fakes form a bidirectional link with no sockets.
 */
class FakeChannel {

    public peer: FakeChannel | null = null;

    public readonly sent: Uint8Array[] = [];

    private _messageHandler: ((message: Uint8Array) => void) | null = null;

    private _closeHandler: (() => void) | null = null;

    /**
     * Record the message and deliver it to the wired peer's handler.
     * @param message - the raw bytes
     */
    public send(message: Uint8Array): void {
        this.sent.push(message);

        if (this.peer !== null && this.peer._messageHandler !== null) {
            this.peer._messageHandler(message);
        }
    }

    /**
     * @param handler - inbound-message handler
     */
    public onMessage(handler: (message: Uint8Array) => void): void {
        this._messageHandler = handler;
    }

    /**
     * @param handler - close handler
     */
    public onClose(handler: () => void): void {
        this._closeHandler = handler;
    }

    /**
     * Fire the close handler.
     */
    public close(): void {
        if (this._closeHandler !== null) {
            this._closeHandler();
        }
    }

}

/**
 * Wire two fake channels into a bidirectional pair and wrap each in a mux.
 */
const buildPair = (): {muxA: ClusterPeerMux; muxB: ClusterPeerMux; chanA: FakeChannel; chanB: FakeChannel;} => {
    const chanA = new FakeChannel();
    const chanB = new FakeChannel();
    chanA.peer = chanB;
    chanB.peer = chanA;

    return {
        muxA: new ClusterPeerMux(chanA as unknown as ClusterPeerChannel),
        muxB: new ClusterPeerMux(chanB as unknown as ClusterPeerChannel),
        chanA: chanA,
        chanB: chanB
    };
};

describe('ClusterPeerMux', () => {
    test('tags an outbound message with its kind byte and strips it inbound', () => {
        const {muxA, muxB, chanA} = buildPair();

        const received: Uint8Array[] = [];
        muxB.channel(ClusterMuxKind.Packet).onMessage((message) => received.push(message));

        const payload = new Uint8Array([0x45, 0x11, 0x22]);
        muxA.channel(ClusterMuxKind.Packet).send(payload);

        // on the wire: kind byte prefixed
        expect(Array.from(chanA.sent[0])).toEqual([ClusterMuxKind.Packet, 0x45, 0x11, 0x22]);
        // at the receiver: kind byte stripped, payload intact
        expect(received).toHaveLength(1);
        expect(Array.from(received[0])).toEqual([0x45, 0x11, 0x22]);
    });

    test('dispatches each kind only to its own sub-channel', () => {
        const {muxA, muxB} = buildPair();

        const packets: Uint8Array[] = [];
        const l4: Uint8Array[] = [];
        muxB.channel(ClusterMuxKind.Packet).onMessage((message) => packets.push(message));
        muxB.channel(ClusterMuxKind.L4).onMessage((message) => l4.push(message));

        muxA.channel(ClusterMuxKind.Packet).send(new Uint8Array([1]));
        muxA.channel(ClusterMuxKind.L4).send(new Uint8Array([2, 2]));
        muxA.channel(ClusterMuxKind.Packet).send(new Uint8Array([3]));

        expect(packets.map((p) => Array.from(p))).toEqual([[1], [3]]);
        expect(l4.map((p) => Array.from(p))).toEqual([[2, 2]]);
    });

    test('carries both directions independently over the one link', () => {
        const {muxA, muxB} = buildPair();

        const atA: Uint8Array[] = [];
        const atB: Uint8Array[] = [];
        muxA.channel(ClusterMuxKind.L4).onMessage((message) => atA.push(message));
        muxB.channel(ClusterMuxKind.L4).onMessage((message) => atB.push(message));

        muxA.channel(ClusterMuxKind.L4).send(new Uint8Array([0xaa]));
        muxB.channel(ClusterMuxKind.L4).send(new Uint8Array([0xbb]));

        expect(atB.map((p) => Array.from(p))).toEqual([[0xaa]]);
        expect(atA.map((p) => Array.from(p))).toEqual([[0xbb]]);
    });

    test('drops a message of an unregistered kind without throwing', () => {
        const {muxA, muxB} = buildPair();

        const l4: Uint8Array[] = [];
        muxB.channel(ClusterMuxKind.L4).onMessage((message) => l4.push(message));

        // Packet has no handler registered on B — must be silently dropped
        expect(() => muxA.channel(ClusterMuxKind.Packet).send(new Uint8Array([9]))).not.toThrow();
        expect(l4).toHaveLength(0);
    });

    test('drops an empty (kind-less) inbound message', () => {
        const {muxB, chanA, chanB} = buildPair();

        const packets: Uint8Array[] = [];
        muxB.channel(ClusterMuxKind.Packet).onMessage((message) => packets.push(message));

        // deliver a zero-length frame straight onto the wire
        chanA.send(new Uint8Array(0));

        expect(chanB.sent).toBeDefined();
        expect(packets).toHaveLength(0);
    });

    test('close passes through to the underlying channel handler', () => {
        const {muxA, chanA} = buildPair();

        let closed = false;
        muxA.onClose(() => {
            closed = true;
        });

        chanA.close();

        expect(closed).toBe(true);
    });
});
