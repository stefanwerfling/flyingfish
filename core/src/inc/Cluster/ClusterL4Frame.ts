/**
 * The operations of the L4 tunnel protocol (Cluster/Mesh epic 9.5.2). A single
 * ingress→egress connection is a stream, identified by a streamId, that runs
 * through this small lifecycle on the {@link ClusterMuxKind.L4} sub-channel.
 */
export enum ClusterL4Op {

    /**
     * Ingress opens a stream: carries the egress-side target to dial.
     */
    Open = 0x01,

    /**
     * Egress answers an Open: carries whether the dial succeeded.
     */
    OpenAck = 0x02,

    /**
     * Payload bytes for a stream (one datagram per frame for UDP).
     */
    Data = 0x03,

    /**
     * A stream is finished (either side); no further frames for that streamId.
     */
    Close = 0x04

}

/**
 * The L4 transport a tunnelled stream carries.
 */
export enum ClusterL4Proto {

    /**
     * TCP: a byte stream.
     */
    Tcp = 0x00,

    /**
     * UDP: datagrams (each {@link ClusterL4Op.Data} frame is one datagram).
     */
    Udp = 0x01

}

/**
 * Where the egress node should connect a tunnelled stream.
 */
export type ClusterL4Target = {
    proto: ClusterL4Proto;
    host: string;
    port: number;
};

/**
 * A decoded L4 frame — a discriminated union on {@link ClusterL4Op}.
 */
export type ClusterL4DecodedFrame =
    | {op: ClusterL4Op.Open; streamId: number; target: ClusterL4Target;}
    | {op: ClusterL4Op.OpenAck; streamId: number; ok: boolean;}
    | {op: ClusterL4Op.Data; streamId: number; data: Uint8Array;}
    | {op: ClusterL4Op.Close; streamId: number;};

const OP_BYTES = 1;
const STREAM_ID_BYTES = 4;
const HEADER_BYTES = OP_BYTES + STREAM_ID_BYTES;
// proto(1) + port(2) + hostLen(1)
const OPEN_FIXED_BYTES = 4;
const MAX_HOST_BYTES = 255;
const MAX_PORT = 0xffff;
const MAX_STREAM_ID = 0xffffffff;

/**
 * Encodes and decodes the frames of the L4 tunnel protocol (Cluster/Mesh epic
 * 9.5.2). Every frame is `[op:1][streamId:4 BE][data...]`; the data layout depends
 * on the op:
 *
 * - Open:    `[proto:1][port:2 BE][hostLen:1][host: UTF-8]`
 * - OpenAck: `[status:1]` (0 = ok, non-zero = failed)
 * - Data:    raw payload bytes
 * - Close:   (no data)
 *
 * Pure byte manipulation, no I/O — the tunnel engine ({@link ClusterL4Ingress} /
 * {@link ClusterL4Egress}) rides these frames over a {@link ClusterPeerMux} L4
 * sub-channel. {@link ClusterL4Frame.decode} returns null on any malformed frame
 * so a peer can never crash the parser.
 */
export class ClusterL4Frame {

    /**
     * Encode an Open frame.
     * @param streamId - the stream to open
     * @param target - where the egress should connect
     */
    public static encodeOpen(streamId: number, target: ClusterL4Target): Uint8Array {
        const host = Buffer.from(target.host, 'utf8');

        if (host.length > MAX_HOST_BYTES) {
            throw new Error(`ClusterL4Frame: host exceeds ${MAX_HOST_BYTES} bytes`);
        }

        const frame = new Uint8Array(HEADER_BYTES + OPEN_FIXED_BYTES + host.length);
        const view = ClusterL4Frame._writeHeader(frame, ClusterL4Op.Open, streamId);

        view.setUint8(HEADER_BYTES, target.proto);
        view.setUint16(HEADER_BYTES + 1, target.port, false);
        view.setUint8(HEADER_BYTES + 3, host.length);
        frame.set(host, HEADER_BYTES + OPEN_FIXED_BYTES);

        return frame;
    }

    /**
     * Encode an OpenAck frame.
     * @param streamId - the stream being acknowledged
     * @param ok - whether the egress dial succeeded
     */
    public static encodeOpenAck(streamId: number, ok: boolean): Uint8Array {
        const frame = new Uint8Array(HEADER_BYTES + 1);
        const view = ClusterL4Frame._writeHeader(frame, ClusterL4Op.OpenAck, streamId);

        view.setUint8(HEADER_BYTES, ok ? 0 : 1);

        return frame;
    }

    /**
     * Encode a Data frame.
     * @param streamId - the stream the payload belongs to
     * @param data - the payload bytes
     */
    public static encodeData(streamId: number, data: Uint8Array): Uint8Array {
        const frame = new Uint8Array(HEADER_BYTES + data.length);
        ClusterL4Frame._writeHeader(frame, ClusterL4Op.Data, streamId);
        frame.set(data, HEADER_BYTES);

        return frame;
    }

    /**
     * Encode a Close frame.
     * @param streamId - the stream to close
     */
    public static encodeClose(streamId: number): Uint8Array {
        const frame = new Uint8Array(HEADER_BYTES);
        ClusterL4Frame._writeHeader(frame, ClusterL4Op.Close, streamId);

        return frame;
    }

    /**
     * Decode one frame, or null if it is malformed (too short, unknown op, or a
     * declared host length that overruns the frame).
     * @param frame - the raw L4 frame bytes (kind byte already stripped by the mux)
     */
    public static decode(frame: Uint8Array): ClusterL4DecodedFrame | null {
        if (frame.length < HEADER_BYTES) {
            return null;
        }

        const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
        const op = view.getUint8(0);
        const streamId = view.getUint32(1, false);

        switch (op) {
            case ClusterL4Op.Open:
                return ClusterL4Frame._decodeOpen(frame, view, streamId);

            case ClusterL4Op.OpenAck:
                if (frame.length < HEADER_BYTES + 1) {
                    return null;
                }

                return {op: ClusterL4Op.OpenAck, streamId: streamId, ok: view.getUint8(HEADER_BYTES) === 0};

            case ClusterL4Op.Data:
                return {op: ClusterL4Op.Data, streamId: streamId, data: frame.subarray(HEADER_BYTES)};

            case ClusterL4Op.Close:
                return {op: ClusterL4Op.Close, streamId: streamId};

            default:
                return null;
        }
    }

    /**
     * Decode the target descriptor of an Open frame.
     * @param frame - the raw frame
     * @param view - a DataView over the frame
     * @param streamId - the already-read streamId
     */
    private static _decodeOpen(frame: Uint8Array, view: DataView, streamId: number): ClusterL4DecodedFrame | null {
        if (frame.length < HEADER_BYTES + OPEN_FIXED_BYTES) {
            return null;
        }

        const proto = view.getUint8(HEADER_BYTES);

        if (proto !== ClusterL4Proto.Tcp && proto !== ClusterL4Proto.Udp) {
            return null;
        }

        const port = view.getUint16(HEADER_BYTES + 1, false);
        const hostLen = view.getUint8(HEADER_BYTES + 3);
        const hostStart = HEADER_BYTES + OPEN_FIXED_BYTES;

        if (frame.length < hostStart + hostLen) {
            return null;
        }

        const host = Buffer.from(frame.subarray(hostStart, hostStart + hostLen)).toString('utf8');

        return {op: ClusterL4Op.Open, streamId: streamId, target: {proto: proto, host: host, port: port}};
    }

    /**
     * Write the common `[op][streamId]` header and return a DataView over the frame.
     * @param frame - the frame buffer to write into
     * @param op - the operation
     * @param streamId - the stream id
     */
    private static _writeHeader(frame: Uint8Array, op: ClusterL4Op, streamId: number): DataView {
        if (streamId < 0 || streamId > MAX_STREAM_ID) {
            throw new Error('ClusterL4Frame: streamId out of range');
        }

        const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
        view.setUint8(0, op);
        view.setUint32(1, streamId, false);

        return view;
    }

}

export {MAX_PORT as CLUSTER_L4_MAX_PORT, MAX_HOST_BYTES as CLUSTER_L4_MAX_HOST_BYTES};