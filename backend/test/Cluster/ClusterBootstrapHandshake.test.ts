/**
 * Tests for the pre-trust bootstrap exchange (Cluster/Mesh epic 9.5.12.2, model (b)
 * "one-port" in-band join): before two nodes trust each other, they swap CA chains
 * (and a join token from the dialer) over the very connection the mesh will use, so
 * no second port is needed. Pure protocol/framing — network-free, using in-memory
 * duplexes.
 */
import {ClusterBootstrapHandshake, ClusterBootstrapHello} from 'flyingfish_core';

/**
 * A minimal in-memory ClusterByteDuplex. Writes are delivered to its linked peer's
 * data handler on a microtask (both handlers are registered synchronously before any
 * delivery, so no message is lost).
 */
class MemDuplex {
    public peer: MemDuplex | null = null;
    private _data: ((chunk: Buffer) => void) | null = null;
    private _close: (() => void) | null = null;

    public write(data: Buffer): void {
        const target = this.peer;

        queueMicrotask((): void => {
            target?._data?.(Buffer.from(data));
        });
    }

    public end(): void {
        // no-op
    }

    public destroy(): void {
        // no-op
    }

    public onData(handler: (chunk: Buffer) => void): void {
        this._data = handler;
    }

    public onClose(handler: () => void): void {
        this._close = handler;
    }

    public onError(): void {
        // no-op
    }

    public inject(chunk: Buffer): void {
        this._data?.(chunk);
    }

    public fireClose(): void {
        this._close?.();
    }
}

const linkedPair = (): [MemDuplex, MemDuplex] => {
    const a = new MemDuplex();
    const b = new MemDuplex();

    a.peer = b;
    b.peer = a;

    return [a, b];
};

describe('ClusterBootstrapHandshake.exchange', () => {
    test('both sides receive the other HELLO; the dialer token reaches the acceptor', async() => {
        const [dialer, acceptor] = linkedPair();

        const dialerHello: ClusterBootstrapHello = {caChain: ['-B-CA-'], token: 'join-token-xyz'};
        const acceptorHello: ClusterBootstrapHello = {caChain: ['-A-CA-']};

        const [seenByDialer, seenByAcceptor] = await Promise.all([
            ClusterBootstrapHandshake.exchange(dialer, dialerHello),
            ClusterBootstrapHandshake.exchange(acceptor, acceptorHello)
        ]);

        // the dialer sees A's CA (no token from the acceptor)
        expect(seenByDialer).toStrictEqual({caChain: ['-A-CA-'], token: undefined});
        // the acceptor sees B's CA AND the join token it must validate
        expect(seenByAcceptor).toStrictEqual({caChain: ['-B-CA-'], token: 'join-token-xyz'});
    });

    test('a malformed peer message resolves to null', async() => {
        const duplex = new MemDuplex();
        const result = ClusterBootstrapHandshake.exchange(duplex, {caChain: ['-OWN-']});

        // frame a non-JSON body with a valid 4-byte length prefix
        const body = Buffer.from('not json', 'utf-8');
        const frame = Buffer.alloc(4 + body.length);

        frame.writeUInt32BE(body.length, 0);
        body.copy(frame, 4);
        duplex.inject(frame);

        expect(await result).toBeNull();
    });

    test('a HELLO with no caChain resolves to null', async() => {
        const duplex = new MemDuplex();
        const result = ClusterBootstrapHandshake.exchange(duplex, {caChain: ['-OWN-']});

        const body = Buffer.from(JSON.stringify({token: 'x'}), 'utf-8');
        const frame = Buffer.alloc(4 + body.length);

        frame.writeUInt32BE(body.length, 0);
        body.copy(frame, 4);
        duplex.inject(frame);

        expect(await result).toBeNull();
    });

    test('times out to null when the peer never answers', async() => {
        const duplex = new MemDuplex();

        expect(await ClusterBootstrapHandshake.exchange(duplex, {caChain: ['-OWN-']}, 20)).toBeNull();
    });

    test('a closed connection resolves to null', async() => {
        const duplex = new MemDuplex();
        const result = ClusterBootstrapHandshake.exchange(duplex, {caChain: ['-OWN-']});

        duplex.fireClose();

        expect(await result).toBeNull();
    });
});
