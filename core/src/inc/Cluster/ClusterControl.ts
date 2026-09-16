import {IClusterMessageChannel} from './ClusterMessageChannel.js';
import {ClusterControlCodec, ClusterControlMessageType} from './ClusterControlMessage.js';

/**
 * The outcome a control-request handler returns and a caller receives: success with an
 * optional payload, or a failure with an error message.
 */
export type ClusterControlReply = {
    ok: boolean;
    payload?: unknown;
    error?: string;
};

/**
 * Handles an inbound control request on the receiving node (Cluster/Mesh epic 9.5.12,
 * A+C): given the operation `method`, its `payload` and the requesting `fromNodeUid`,
 * apply it and return the outcome. Node B trusts the authenticated mesh peer, so the
 * handler applies the already-authorized write and reports OK/error.
 * @param method - the operation name
 * @param payload - the operation payload (arbitrary JSON)
 * @param fromNodeUid - the requesting peer's cluster nodeUid
 */
export type ClusterControlHandler = (method: string, payload: unknown, fromNodeUid: string) => Promise<ClusterControlReply>;

/**
 * The default request timeout (ms): a request whose reply does not arrive in this
 * window rejects, so a dead/slow peer can't hang the caller forever.
 */
export const CLUSTER_CONTROL_TIMEOUT_MS = 10000;

/**
 * One in-flight request awaiting its reply.
 */
type PendingRequest = {
    resolve: (reply: ClusterControlReply) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
};

/**
 * The synchronous cluster-control request/reply engine (Cluster/Mesh epic 9.5.12,
 * A+C cross-node write path): over each peer's {@link ClusterMuxKind.Control}
 * sub-channel it sends a request and resolves the caller's promise when the matching
 * reply (by correlation id) arrives, and it answers inbound requests via a registered
 * {@link ClusterControlHandler}. This is the transport under the flagship "edit a
 * resource on node B from node A's UI": node A enforces locally, then asks node B to
 * apply the write and waits for B's OK/error. Malformed messages are dropped; a
 * reply that never comes rejects on timeout.
 */
export class ClusterControl {

    private readonly _peers: Map<string, IClusterMessageChannel> = new Map();

    private readonly _pending: Map<number, PendingRequest> = new Map();

    private readonly _timeoutMs: number;

    private _handler: ClusterControlHandler | null = null;

    private _nextId = 1;

    /**
     * @param timeoutMs - per-request reply timeout (default {@link CLUSTER_CONTROL_TIMEOUT_MS})
     */
    public constructor(timeoutMs: number = CLUSTER_CONTROL_TIMEOUT_MS) {
        this._timeoutMs = timeoutMs;
    }

    /**
     * Register the handler for inbound requests. Replaces any previous handler.
     * @param handler - the request handler
     */
    public onRequest(handler: ClusterControlHandler): void {
        this._handler = handler;
    }

    /**
     * Register a peer's control sub-channel. Idempotent per nodeUid.
     * @param nodeUid - the peer's cluster nodeUid
     * @param channel - the peer's control mux sub-channel
     */
    public addPeer(nodeUid: string, channel: IClusterMessageChannel): void {
        if (this._peers.has(nodeUid)) {
            return;
        }

        this._peers.set(nodeUid, channel);
        channel.onMessage((message: Uint8Array): void => this._onMessage(nodeUid, channel, message));
    }

    /**
     * Forget a peer and reject any of its in-flight requests (the link is gone).
     * @param nodeUid - the peer's cluster nodeUid
     */
    public removePeer(nodeUid: string): void {
        this._peers.delete(nodeUid);
    }

    /**
     * Send a request to a peer and resolve with its reply, or reject if the peer is
     * unknown or the reply times out.
     * @param nodeUid - the target peer's cluster nodeUid
     * @param method - the operation name
     * @param payload - the operation payload (arbitrary JSON)
     */
    public async request(nodeUid: string, method: string, payload: unknown): Promise<ClusterControlReply> {
        const channel = this._peers.get(nodeUid);

        if (channel === undefined) {
            throw new Error(`ClusterControl: no peer '${nodeUid}'`);
        }

        const id = this._nextId++;

        return new Promise<ClusterControlReply>((resolve, reject) => {
            const timer = setTimeout((): void => {
                this._pending.delete(id);
                reject(new Error(`ClusterControl: request '${method}' to '${nodeUid}' timed out`));
            }, this._timeoutMs);

            this._pending.set(id, {resolve: resolve, reject: reject, timer: timer});
            channel.send(ClusterControlCodec.encode({type: ClusterControlMessageType.Request, id: id, method: method, payload: payload}));
        });
    }

    /**
     * Route one inbound control message: a REQUEST is dispatched to the handler and its
     * outcome replied on the same channel; a REPLY resolves the matching pending
     * request. Malformed messages are dropped.
     * @param fromNodeUid - the peer the message came from
     * @param channel - the channel it arrived on (replies go back over it)
     * @param bytes - the raw message bytes
     */
    private _onMessage(fromNodeUid: string, channel: IClusterMessageChannel, bytes: Uint8Array): void {
        const message = ClusterControlCodec.decode(bytes);

        if (message === null) {
            return;
        }

        if (message.type === ClusterControlMessageType.Reply) {
            const pending = this._pending.get(message.id);

            if (pending !== undefined) {
                clearTimeout(pending.timer);
                this._pending.delete(message.id);
                pending.resolve({ok: message.ok, payload: message.payload, error: message.error});
            }

            return;
        }

        // A request: run the handler (if any) and reply on the same channel. Any handler
        // rejection becomes an error reply so the caller always gets an answer.
        this._handle(fromNodeUid, channel, message.id, message.method, message.payload).catch((): void => {
            // _handle answers on its own and swallows handler errors; nothing to do here.
        });
    }

    /**
     * Run the request handler and send its outcome back as a reply.
     * @param fromNodeUid - the requesting peer
     * @param channel - the channel to reply on
     * @param id - the request correlation id
     * @param method - the operation name
     * @param payload - the operation payload
     */
    private async _handle(fromNodeUid: string, channel: IClusterMessageChannel, id: number, method: string, payload: unknown): Promise<void> {
        let reply: ClusterControlReply;

        if (this._handler === null) {
            reply = {ok: false, error: 'ClusterControl: no request handler registered'};
        } else {
            try {
                reply = await this._handler(method, payload, fromNodeUid);
            } catch (error) {
                reply = {ok: false, error: error instanceof Error ? error.message : 'ClusterControl: handler failed'};
            }
        }

        channel.send(ClusterControlCodec.encode({
            type: ClusterControlMessageType.Reply,
            id: id,
            ok: reply.ok,
            payload: reply.payload,
            error: reply.error
        }));
    }

}