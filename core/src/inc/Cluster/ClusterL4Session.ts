import {IClusterMessageChannel} from './ClusterMessageChannel.js';
import {ClusterL4Frame, ClusterL4Op, ClusterL4Target} from './ClusterL4Frame.js';
import {IClusterL4Dialer, IClusterL4Stream} from './ClusterL4Stream.js';

/**
 * The role this node plays for one stream: `origin` opened it (ingress side, its
 * local endpoint is the accepted socket) or `target` accepted the peer's Open
 * (egress side, its local endpoint is the dialed socket).
 */
enum StreamRole {
    Origin,
    Target
}

/**
 * Per-stream state inside a session.
 */
type StreamState = {
    role: StreamRole;
    local: IClusterL4Stream | null;
    pending: Uint8Array[];
    closed: boolean;
};

const STREAM_ID_MODULO = 0x100000000;

/**
 * One L4 tunnel session over a single authenticated peer link (Cluster/Mesh epic
 * 9.5.2). It rides a {@link ClusterMuxKind.L4} sub-channel of a {@link ClusterPeerMux}
 * and multiplexes many concurrent tunnelled connections (streams) over it, playing
 * both roles at once:
 *
 * - Origin: {@link ClusterL4Session.openStream} allocates a streamId, sends Open
 *   with the egress target, and pumps the local (ingress) socket's bytes to the
 *   peer as Data frames.
 * - Target: an inbound Open dials the target via the injected {@link IClusterL4Dialer};
 *   Data frames that arrive before the dial resolves are buffered and flushed in
 *   order once it does, then bytes flow both ways. A failed dial answers OpenAck(fail).
 *
 * StreamIds must not collide between the two peers that both open streams on the one
 * link, so the id space is partitioned by parity: the numerically-lower nodeUid
 * allocates even ids, the higher odd. A single id therefore identifies a stream
 * unambiguously in one shared table regardless of which side opened it, and Data /
 * Close frames need only carry the id. Malformed frames are dropped.
 */
export class ClusterL4Session {

    private readonly _channel: IClusterMessageChannel;

    private readonly _dialer: IClusterL4Dialer;

    private readonly _streams: Map<number, StreamState> = new Map();

    private _nextStreamId: number;

    /**
     * @param channel - the L4 mux sub-channel to the peer
     * @param dialer - dials the egress target for inbound (target-role) streams
     * @param lowNode - true if this node's nodeUid is the numerically-lower of the
     *                  pair (allocates even streamIds; the peer allocates odd)
     */
    public constructor(channel: IClusterMessageChannel, dialer: IClusterL4Dialer, lowNode: boolean) {
        this._channel = channel;
        this._dialer = dialer;
        this._nextStreamId = lowNode ? 2 : 1;

        this._channel.onMessage((message: Uint8Array): void => this._onFrame(message));
    }

    /**
     * Open a tunnelled stream to the peer for a freshly-accepted local endpoint
     * (origin role). Sends Open, then pumps the local socket's bytes as Data frames
     * and closes the stream when the socket ends.
     * @param target - where the peer (egress) should connect
     * @param local - the local (ingress) endpoint
     */
    public openStream(target: ClusterL4Target, local: IClusterL4Stream): void {
        const streamId = this._allocateStreamId();

        this._streams.set(streamId, {role: StreamRole.Origin, local: local, pending: [], closed: false});

        // Open must be the first frame for this id; wire the pumps only afterwards so
        // no Data can overtake it.
        this._channel.send(ClusterL4Frame.encodeOpen(streamId, target));
        this._wireLocal(streamId, local);
    }

    /**
     * The number of currently-open streams (observability / tests).
     */
    public streamCount(): number {
        return this._streams.size;
    }

    /**
     * Close every open stream's local endpoint and forget them. The peer link itself
     * is owned by the mux, not the session.
     */
    public close(): void {
        for (const state of this._streams.values()) {
            state.closed = true;

            if (state.local !== null) {
                state.local.close();
            }
        }

        this._streams.clear();
    }

    /**
     * Route one inbound L4 frame.
     * @param message - the raw L4 frame (kind byte already stripped by the mux)
     */
    private _onFrame(message: Uint8Array): void {
        const frame = ClusterL4Frame.decode(message);

        if (frame === null) {
            return;
        }

        switch (frame.op) {
            case ClusterL4Op.Open:
                this._onOpen(frame.streamId, frame.target);
                break;

            case ClusterL4Op.OpenAck:
                this._onOpenAck(frame.streamId, frame.ok);
                break;

            case ClusterL4Op.Data:
                this._onData(frame.streamId, (frame as {data: Uint8Array;}).data);
                break;

            case ClusterL4Op.Close:
                this._onClose(frame.streamId);
                break;

            default:
                break;
        }
    }

    /**
     * Handle an inbound Open (target role): dial the target and, on success, answer
     * OpenAck(ok) and flush any buffered Data; on failure answer OpenAck(fail).
     * @param streamId - the peer-chosen stream id
     * @param target - the target to dial
     */
    private _onOpen(streamId: number, target: ClusterL4Target): void {
        if (this._streams.has(streamId)) {
            return;
        }

        const state: StreamState = {role: StreamRole.Target, local: null, pending: [], closed: false};
        this._streams.set(streamId, state);

        this._dialer.dial(target).then((local: IClusterL4Stream): void => {
            if (state.closed) {
                local.close();
                return;
            }

            state.local = local;
            this._wireLocal(streamId, local);
            this._channel.send(ClusterL4Frame.encodeOpenAck(streamId, true));

            for (const chunk of state.pending) {
                local.write(chunk);
            }

            state.pending = [];
        }).catch((): void => {
            if (!state.closed) {
                this._channel.send(ClusterL4Frame.encodeOpenAck(streamId, false));
            }

            this._streams.delete(streamId);
        });
    }

    /**
     * Handle an OpenAck for a stream this node opened (origin role): a failed dial on
     * the peer tears the local endpoint down.
     * @param streamId - the stream id
     * @param ok - whether the peer's dial succeeded
     */
    private _onOpenAck(streamId: number, ok: boolean): void {
        if (ok) {
            return;
        }

        const state = this._streams.get(streamId);

        if (state !== undefined) {
            state.closed = true;

            if (state.local !== null) {
                state.local.close();
            }

            this._streams.delete(streamId);
        }
    }

    /**
     * Handle inbound Data: write to the local endpoint, or buffer it if the egress
     * dial is still pending.
     * @param streamId - the stream id
     * @param data - the payload
     */
    private _onData(streamId: number, data: Uint8Array): void {
        const state = this._streams.get(streamId);

        if (state === undefined || state.closed) {
            return;
        }

        if (state.local === null) {
            state.pending.push(data);

            return;
        }

        state.local.write(data);
    }

    /**
     * Handle an inbound Close: tear down the local endpoint and forget the stream.
     * @param streamId - the stream id
     */
    private _onClose(streamId: number): void {
        const state = this._streams.get(streamId);

        if (state === undefined) {
            return;
        }

        state.closed = true;

        if (state.local !== null) {
            state.local.close();
        }

        this._streams.delete(streamId);
    }

    /**
     * Pump a local endpoint's bytes to the peer as Data frames, and send Close (and
     * drop the stream) when it ends. Called once the local endpoint exists.
     * @param streamId - the stream id
     * @param local - the local endpoint
     */
    private _wireLocal(streamId: number, local: IClusterL4Stream): void {
        local.onData((data: Uint8Array): void => {
            const state = this._streams.get(streamId);

            if (state !== undefined && !state.closed) {
                this._channel.send(ClusterL4Frame.encodeData(streamId, data));
            }
        });

        local.onClose((): void => {
            const state = this._streams.get(streamId);

            if (state === undefined || state.closed) {
                return;
            }

            state.closed = true;
            this._channel.send(ClusterL4Frame.encodeClose(streamId));
            this._streams.delete(streamId);
        });
    }

    /**
     * Allocate the next free streamId in this node's parity space, skipping any id
     * that is somehow still occupied (wraparound safety).
     */
    private _allocateStreamId(): number {
        let streamId = this._nextStreamId;

        while (this._streams.has(streamId)) {
            streamId = (streamId + 2) % STREAM_ID_MODULO;
        }

        this._nextStreamId = (streamId + 2) % STREAM_ID_MODULO;

        return streamId;
    }

}