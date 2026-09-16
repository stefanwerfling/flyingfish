/**
 * Tests for the cluster-control codec + request/reply engine (Cluster/Mesh epic
 * 9.5.12, A+C synchronous cross-node write path): the JSON codec round-trips and
 * rejects malformed input, a request is dispatched to the peer's handler and its
 * OK/error reply resolves the caller, a throwing handler and a missing handler both
 * still answer, concurrent requests correlate independently, an unknown peer throws,
 * and a silent peer times out. Driven by in-memory paired channels — network-free.
 */
import {
    ClusterControl,
    ClusterControlCodec,
    ClusterControlMessageType,
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
 * Wire two control engines over a paired link, each knowing the other by nodeUid.
 */
const connect = (): {a: ClusterControl; b: ClusterControl;} => {
    const [chA, chB] = createPair();
    const a = new ClusterControl();
    const b = new ClusterControl();
    a.addPeer('node-b', chA);
    b.addPeer('node-a', chB);

    return {a: a, b: b};
};

describe('ClusterControlCodec', () => {
    test('round-trips a request and a reply', () => {
        const request = ClusterControlCodec.decode(ClusterControlCodec.encode({
            type: ClusterControlMessageType.Request, id: 7, method: 'domain.write', payload: {name: 'x.test'}
        }));
        expect(request).toEqual({type: 'req', id: 7, method: 'domain.write', payload: {name: 'x.test'}});

        const reply = ClusterControlCodec.decode(ClusterControlCodec.encode({
            type: ClusterControlMessageType.Reply, id: 7, ok: true, payload: {id: 42}
        }));
        expect(reply).toEqual({type: 'rep', id: 7, ok: true, payload: {id: 42}, error: undefined});
    });

    test('returns null on malformed / unknown shapes', () => {
        expect(ClusterControlCodec.decode(new Uint8Array([0x7b, 0x00]))).toBeNull();
        expect(ClusterControlCodec.decode(ClusterControlCodec.encode({type: ClusterControlMessageType.Request, id: 1, method: 'm', payload: 1}))).not.toBeNull();
        // a request missing its method is rejected
        expect(ClusterControlCodec.decode(new Uint8Array(Buffer.from(JSON.stringify({type: 'req', id: 1}), 'utf8')))).toBeNull();
        // an unknown type is rejected
        expect(ClusterControlCodec.decode(new Uint8Array(Buffer.from(JSON.stringify({type: 'nope'}), 'utf8')))).toBeNull();
    });
});

describe('ClusterControl request/reply', () => {
    test('dispatches a request to the peer handler and resolves the caller with its reply', async() => {
        const {a, b} = connect();
        const seen: {method: string; payload: unknown; from: string;}[] = [];

        b.onRequest(async(method, payload, from) => {
            seen.push({method: method, payload: payload, from: from});

            return {ok: true, payload: {applied: true}};
        });

        const reply = await a.request('node-b', 'domain.write', {name: 'x.test'});

        expect(reply).toEqual({ok: true, payload: {applied: true}, error: undefined});
        expect(seen).toEqual([{method: 'domain.write', payload: {name: 'x.test'}, from: 'node-a'}]);
    });

    test('a handler that returns an error, and a throwing handler, both answer the caller', async() => {
        const {a, b} = connect();

        b.onRequest(async(method) => method === 'boom'
            ? Promise.reject(new Error('kaboom'))
            : {ok: false, error: 'denied'});

        expect(await a.request('node-b', 'nope', {})).toEqual({ok: false, payload: undefined, error: 'denied'});
        expect(await a.request('node-b', 'boom', {})).toEqual({ok: false, payload: undefined, error: 'kaboom'});
    });

    test('a peer with no registered handler still answers (error reply)', async() => {
        const {a} = connect();

        const reply = await a.request('node-b', 'domain.write', {});
        expect(reply.ok).toBe(false);
        expect(reply.error).toMatch(/no request handler/u);
    });

    test('concurrent requests correlate independently', async() => {
        const {a, b} = connect();
        b.onRequest(async(method, payload) => ({ok: true, payload: payload}));

        const [r1, r2, r3] = await Promise.all([
            a.request('node-b', 'm', {n: 1}),
            a.request('node-b', 'm', {n: 2}),
            a.request('node-b', 'm', {n: 3})
        ]);

        expect([r1.payload, r2.payload, r3.payload]).toEqual([{n: 1}, {n: 2}, {n: 3}]);
    });

    test('requesting an unknown peer throws', async() => {
        const a = new ClusterControl();

        await expect(a.request('ghost', 'm', {})).rejects.toThrow(/no peer/u);
    });

    test('a silent peer times out (the request is sent; no reply ever comes)', async() => {
        const a = new ClusterControl(20);
        const outbox: Uint8Array[] = [];
        let registered = false;

        // a black-hole channel: it accepts the outbound request but never delivers a reply
        a.addPeer('node-b', {
            send: (message: Uint8Array): void => {
                outbox.push(message);
            },
            onMessage: (): void => {
                registered = true;
            }
        });

        await expect(a.request('node-b', 'm', {})).rejects.toThrow(/timed out/u);
        expect(outbox).toHaveLength(1);
        expect(registered).toBe(true);
    });
});