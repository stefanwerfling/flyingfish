/**
 * Unit tests for the L4 tunnel coordinator (Cluster/Mesh epic 9.5.2): one session
 * per peer keyed by nodeUid, streamId parity derived from the self/peer nodeUid
 * ordering, open() routing to the right peer (and closing the local endpoint when
 * the peer is absent), idempotent addPeer, and removePeer teardown. Fakes are
 * factory functions to keep one class per file (there are none here). Network-free.
 */
import {
    ClusterL4DecodedFrame,
    ClusterL4Frame,
    ClusterL4Op,
    ClusterL4Proto,
    ClusterL4Target,
    ClusterL4Tunnel,
    IClusterL4Dialer,
    IClusterL4Stream
} from 'flyingfish_core';

/**
 * Build a fake mux sub-channel recording decoded outbound frames.
 */
const createChannel = (): {sent: ClusterL4DecodedFrame[]; send(m: Uint8Array): void; onMessage(h: (m: Uint8Array) => void): void;} => {
    const sent: ClusterL4DecodedFrame[] = [];

    return {
        sent: sent,
        send: (message: Uint8Array): void => {
            const decoded = ClusterL4Frame.decode(message);

            if (decoded !== null) {
                sent.push(decoded);
            }
        },
        onMessage: (): void => {
            // inbound not exercised here
        }
    };
};

/**
 * Build a fake local endpoint tracking close.
 */
const createStream = (): IClusterL4Stream & {isClosed(): boolean;} => {
    let closed = false;

    return {
        write: (): void => {
            // not exercised
        },
        onData: (): void => {
            // not exercised
        },
        onClose: (): void => {
            // not exercised
        },
        close: (): void => {
            closed = true;
        },
        isClosed: (): boolean => closed
    };
};

const dialer: IClusterL4Dialer = {
    dial: async(): Promise<IClusterL4Stream> => createStream()
};

const target: ClusterL4Target = {proto: ClusterL4Proto.Tcp, host: '10.0.0.9', port: 5000};

describe('ClusterL4Tunnel (coordinator)', () => {
    test('addPeer is idempotent and peerCount/hasPeer track the set', () => {
        const tunnel = new ClusterL4Tunnel('node-a', dialer);

        tunnel.addPeer('node-b', createChannel());
        tunnel.addPeer('node-b', createChannel());

        expect(tunnel.hasPeer('node-b')).toBe(true);
        expect(tunnel.hasPeer('node-c')).toBe(false);
        expect(tunnel.peerCount()).toBe(1);
    });

    test('open routes to the addressed peer and derives streamId parity from nodeUid order', () => {
        const tunnel = new ClusterL4Tunnel('node-m', dialer);

        // self "node-m" < "node-z" → this node is the low side → even streamIds
        const chZ = createChannel();
        tunnel.addPeer('node-z', chZ);
        // self "node-m" > "node-a" → high side → odd streamIds
        const chA = createChannel();
        tunnel.addPeer('node-a', chA);

        expect(tunnel.open('node-z', target, createStream())).toBe(true);
        expect(tunnel.open('node-a', target, createStream())).toBe(true);

        expect(chZ.sent[0]).toEqual({op: ClusterL4Op.Open, streamId: 2, target: target});
        expect(chA.sent[0]).toEqual({op: ClusterL4Op.Open, streamId: 1, target: target});
    });

    test('open to an unconnected peer closes the local endpoint and returns false', () => {
        const tunnel = new ClusterL4Tunnel('node-a', dialer);
        const local = createStream();

        expect(tunnel.open('node-missing', target, local)).toBe(false);
        expect(local.isClosed()).toBe(true);
    });

    test('removePeer tears the session down and drops the peer', () => {
        const tunnel = new ClusterL4Tunnel('node-a', dialer);
        tunnel.addPeer('node-b', createChannel());

        tunnel.removePeer('node-b');

        expect(tunnel.hasPeer('node-b')).toBe(false);
        expect(tunnel.peerCount()).toBe(0);
        // opening after removal fails cleanly
        const local = createStream();
        expect(tunnel.open('node-b', target, local)).toBe(false);
        expect(local.isClosed()).toBe(true);
    });
});