/**
 * Unit tests for the L4 tunnel frame codec (Cluster/Mesh epic 9.5.2). Covers a
 * round-trip of every op (Open/OpenAck/Data/Close), the on-the-wire header layout,
 * UTF-8 host handling, and rejection of malformed frames so a peer can never crash
 * the parser. Pure byte manipulation, network-free.
 */
import {ClusterL4Frame, ClusterL4Op, ClusterL4Proto} from 'flyingfish_core';

describe('ClusterL4Frame', () => {
    test('Open round-trips proto/host/port and lays out the header op+streamId', () => {
        const frame = ClusterL4Frame.encodeOpen(258, {proto: ClusterL4Proto.Tcp, host: '10.0.0.5', port: 8080});

        // header: op=Open, streamId=258 big-endian (0x00000102)
        expect(frame[0]).toBe(ClusterL4Op.Open);
        expect(Array.from(frame.subarray(1, 5))).toEqual([0x00, 0x00, 0x01, 0x02]);

        const decoded = ClusterL4Frame.decode(frame);
        expect(decoded).not.toBeNull();
        expect(decoded).toEqual({
            op: ClusterL4Op.Open,
            streamId: 258,
            target: {proto: ClusterL4Proto.Tcp, host: '10.0.0.5', port: 8080}
        });
    });

    test('Open carries a UTF-8 hostname and a UDP proto', () => {
        const frame = ClusterL4Frame.encodeOpen(1, {proto: ClusterL4Proto.Udp, host: 'dns.exämple.test', port: 53});
        const decoded = ClusterL4Frame.decode(frame);

        expect(decoded).toEqual({
            op: ClusterL4Op.Open,
            streamId: 1,
            target: {proto: ClusterL4Proto.Udp, host: 'dns.exämple.test', port: 53}
        });
    });

    test('OpenAck round-trips the ok flag both ways', () => {
        expect(ClusterL4Frame.decode(ClusterL4Frame.encodeOpenAck(7, true)))
        .toEqual({op: ClusterL4Op.OpenAck, streamId: 7, ok: true});
        expect(ClusterL4Frame.decode(ClusterL4Frame.encodeOpenAck(7, false)))
        .toEqual({op: ClusterL4Op.OpenAck, streamId: 7, ok: false});
    });

    test('Data round-trips an arbitrary payload including empty', () => {
        const payload = new Uint8Array([0, 255, 13, 10, 42]);
        const decoded = ClusterL4Frame.decode(ClusterL4Frame.encodeData(99, payload));

        expect(decoded!.op).toBe(ClusterL4Op.Data);
        expect(decoded!.streamId).toBe(99);
        expect(Array.from((decoded as {data: Uint8Array;}).data)).toEqual([0, 255, 13, 10, 42]);

        const empty = ClusterL4Frame.decode(ClusterL4Frame.encodeData(99, new Uint8Array(0)));
        expect((empty as {data: Uint8Array;}).data).toHaveLength(0);
    });

    test('Close round-trips just the streamId', () => {
        expect(ClusterL4Frame.decode(ClusterL4Frame.encodeClose(0xdeadbeef)))
        .toEqual({op: ClusterL4Op.Close, streamId: 0xdeadbeef});
    });

    test('decode returns null for a frame shorter than the header', () => {
        expect(ClusterL4Frame.decode(new Uint8Array([ClusterL4Op.Data, 0, 0]))).toBeNull();
    });

    test('decode returns null for an unknown op', () => {
        expect(ClusterL4Frame.decode(new Uint8Array([0x7f, 0, 0, 0, 1]))).toBeNull();
    });

    test('decode returns null when an Open host length overruns the frame', () => {
        const frame = ClusterL4Frame.encodeOpen(1, {proto: ClusterL4Proto.Tcp, host: 'abcdef', port: 80});
        // truncate two host bytes but leave the declared hostLen intact
        expect(ClusterL4Frame.decode(frame.subarray(0, frame.length - 2))).toBeNull();
    });

    test('decode returns null for an Open with an invalid proto', () => {
        const frame = ClusterL4Frame.encodeOpen(1, {proto: ClusterL4Proto.Tcp, host: 'x', port: 80});
        // corrupt the proto byte (position: header 5 + 0)
        const corrupted = Uint8Array.from(frame);
        corrupted[5] = 0x09;
        expect(ClusterL4Frame.decode(corrupted)).toBeNull();
    });

    test('decode survives a frame whose backing buffer has a non-zero byteOffset', () => {
        const frame = ClusterL4Frame.encodeOpen(5, {proto: ClusterL4Proto.Tcp, host: '1.2.3.4', port: 443});
        // simulate the mux handing a subarray view (kind byte stripped) with an offset
        const backing = new Uint8Array(frame.length + 3);
        backing.set(frame, 3);
        const view = backing.subarray(3);

        expect(ClusterL4Frame.decode(view)).toEqual({
            op: ClusterL4Op.Open,
            streamId: 5,
            target: {proto: ClusterL4Proto.Tcp, host: '1.2.3.4', port: 443}
        });
    });

    test('encodeOpen rejects a host longer than 255 bytes', () => {
        expect(() => ClusterL4Frame.encodeOpen(1, {proto: ClusterL4Proto.Tcp, host: 'a'.repeat(256), port: 80}))
        .toThrow(/host exceeds/u);
    });
});