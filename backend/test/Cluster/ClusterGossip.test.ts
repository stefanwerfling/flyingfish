/**
 * Tests for the gossip codec + anti-entropy engine (Cluster/Mesh epic 9.5.12): the
 * JSON message codec round-trips and rejects malformed input, a two-node exchange
 * reconciles both directions, a three-node line converges transitively through the
 * middle node, deletes (tombstones) propagate, eager broadcast pushes a single entry,
 * and a garbage message is dropped. Driven by in-memory paired channels — network-free.
 */
import {
    ClusterGossip,
    ClusterGossipCodec,
    ClusterGossipEntry,
    ClusterGossipMessageType,
    ClusterGossipStore,
    IClusterMessageChannel
} from 'flyingfish_core';

/**
 * A pair of in-memory channel ends: bytes sent on one arrive at the other's handler.
 */
const createPair = (): [IClusterMessageChannel, IClusterMessageChannel] => {
    let handlerA: ((message: Uint8Array) => void) | null = null;
    let handlerB: ((message: Uint8Array) => void) | null = null;

    const a: IClusterMessageChannel = {
        send: (message: Uint8Array): void => {
            if (handlerB !== null) {
                handlerB(new Uint8Array(message));
            }
        },
        onMessage: (handler: (message: Uint8Array) => void): void => {
            handlerA = handler;
        }
    };
    const b: IClusterMessageChannel = {
        send: (message: Uint8Array): void => {
            if (handlerA !== null) {
                handlerA(new Uint8Array(message));
            }
        },
        onMessage: (handler: (message: Uint8Array) => void): void => {
            handlerB = handler;
        }
    };

    return [a, b];
};

/**
 * The live state of a store as a plain map.
 * @param store - the gossip store
 */
const live = (store: ClusterGossipStore): Record<string, unknown> =>
    Object.fromEntries(store.liveEntries().map((entry) => [entry.key, entry.value]));

/**
 * Run several full anti-entropy rounds over a set of engines.
 * @param engines - the gossip engines
 * @param rounds - how many rounds
 */
const gossipRounds = (engines: ClusterGossip[], rounds: number): void => {
    for (let round = 0; round < rounds; round++) {
        for (const engine of engines) {
            engine.sync();
        }
    }
};

describe('ClusterGossipCodec', () => {
    test('round-trips each message type', () => {
        const entry: ClusterGossipEntry = {key: 'k', value: {a: 1}, version: {lamport: 3, nodeUid: 'n'}, deleted: false};

        expect(ClusterGossipCodec.decode(ClusterGossipCodec.encode({
            type: ClusterGossipMessageType.Digest, digest: [{key: 'k', version: {lamport: 3, nodeUid: 'n'}}]
        }))).toEqual({type: ClusterGossipMessageType.Digest, digest: [{key: 'k', version: {lamport: 3, nodeUid: 'n'}}]});

        expect(ClusterGossipCodec.decode(ClusterGossipCodec.encode({
            type: ClusterGossipMessageType.Entries, entries: [entry]
        }))).toEqual({type: ClusterGossipMessageType.Entries, entries: [entry]});

        expect(ClusterGossipCodec.decode(ClusterGossipCodec.encode({
            type: ClusterGossipMessageType.Request, keys: ['a', 'b']
        }))).toEqual({type: ClusterGossipMessageType.Request, keys: ['a', 'b']});
    });

    test('decode returns null on non-JSON and unknown shapes', () => {
        expect(ClusterGossipCodec.decode(new Uint8Array([0xff, 0x00, 0x01]))).toBeNull();
        expect(ClusterGossipCodec.decode(new Uint8Array(Buffer.from('{"type":"nope"}', 'utf8')))).toBeNull();
        expect(ClusterGossipCodec.decode(new Uint8Array(Buffer.from('123', 'utf8')))).toBeNull();
    });
});

describe('ClusterGossip (anti-entropy engine)', () => {
    test('a two-node exchange reconciles both directions in one sync', () => {
        const storeA = new ClusterGossipStore('node-a');
        const storeB = new ClusterGossipStore('node-b');
        storeA.set('x', 1);
        storeB.set('y', 2);

        const engineA = new ClusterGossip(storeA);
        const engineB = new ClusterGossip(storeB);
        const [chA, chB] = createPair();
        engineA.addPeer('node-b', chA);
        engineB.addPeer('node-a', chB);

        engineA.sync();

        expect(live(storeA)).toEqual({x: 1, y: 2});
        expect(live(storeB)).toEqual({x: 1, y: 2});
    });

    test('a three-node line converges transitively through the middle node', () => {
        const stores = {
            a: new ClusterGossipStore('node-a'),
            b: new ClusterGossipStore('node-b'),
            c: new ClusterGossipStore('node-c')
        };
        stores.a.set('from-a', 'A');
        stores.c.set('from-c', 'C');
        stores.b.set('from-b', 'B');

        const engineA = new ClusterGossip(stores.a);
        const engineB = new ClusterGossip(stores.b);
        const engineC = new ClusterGossip(stores.c);

        // topology A—B—C (A and C are not directly connected)
        const [ab, ba] = createPair();
        const [bc, cb] = createPair();
        engineA.addPeer('node-b', ab);
        engineB.addPeer('node-a', ba);
        engineB.addPeer('node-c', bc);
        engineC.addPeer('node-b', cb);

        gossipRounds([engineA, engineB, engineC], 3);

        const expected = {'from-a': 'A', 'from-b': 'B', 'from-c': 'C'};
        expect(live(stores.a)).toEqual(expected);
        expect(live(stores.b)).toEqual(expected);
        expect(live(stores.c)).toEqual(expected);
    });

    test('a delete propagates as a tombstone', () => {
        const storeA = new ClusterGossipStore('node-a');
        const storeB = new ClusterGossipStore('node-b');
        storeA.set('k', 'v');

        const engineA = new ClusterGossip(storeA);
        const engineB = new ClusterGossip(storeB);
        const [chA, chB] = createPair();
        engineA.addPeer('node-b', chA);
        engineB.addPeer('node-a', chB);

        gossipRounds([engineA, engineB], 1);
        expect(storeB.has('k')).toBe(true);

        storeA.remove('k');
        gossipRounds([engineA, engineB], 1);
        expect(storeA.has('k')).toBe(false);
        expect(storeB.has('k')).toBe(false);
    });

    test('broadcast eagerly pushes one entry without a full sync', () => {
        const storeA = new ClusterGossipStore('node-a');
        const storeB = new ClusterGossipStore('node-b');

        const engineA = new ClusterGossip(storeA);
        const engineB = new ClusterGossip(storeB);
        const [chA, chB] = createPair();
        engineA.addPeer('node-b', chA);
        engineB.addPeer('node-a', chB);

        engineA.broadcast(storeA.set('urgent', 42));

        expect(storeB.get('urgent')).toBe(42);
        expect(engineA.peerCount()).toBe(1);
    });

    test('a garbage message is dropped without throwing or mutating state', () => {
        const store = new ClusterGossipStore('node-a');
        store.set('k', 'v');
        const engine = new ClusterGossip(store);

        let deliver: ((message: Uint8Array) => void) | null = null;
        engine.addPeer('node-b', {
            send: (): void => undefined,
            onMessage: (handler: (message: Uint8Array) => void): void => {
                deliver = handler;
            }
        });

        expect(() => deliver!(new Uint8Array([0xde, 0xad]))).not.toThrow();
        expect(store.get('k')).toBe('v');
    });
});