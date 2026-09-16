import {IClusterMessageChannel} from './ClusterMessageChannel.js';
import {ClusterPeerChannel} from './ClusterPeerChannel.js';

/**
 * The subsystem a multiplexed peer message belongs to. The first byte of every
 * message on a muxed peer link is one of these, so a single authenticated channel
 * carries both the L3 overlay and the L4 tunnel at once.
 */
export enum ClusterMuxKind {

    /**
     * A raw L3 IP packet for the {@link ClusterDatapath}.
     */
    Packet = 0x01,

    /**
     * An L4 tunnel frame (connection open/data/close) for the L4 tunnel engine.
     */
    L4 = 0x02,

    /**
     * A cluster gossip message (state anti-entropy) for the gossip engine (9.5.12).
     */
    Gossip = 0x03,

    /**
     * A cluster control request/reply for the {@link ClusterControl} engine — the
     * synchronous cross-node write path (Cluster/Mesh epic 9.5.12, A+C): node A asks
     * node B to apply an authorized write and B answers OK/error.
     */
    Control = 0x04

}

/**
 * Multiplexes several logical message channels over one authenticated
 * {@link ClusterPeerChannel} (Cluster/Mesh epic 9.5.2). There is only ever one peer
 * channel per node pair — {@link ClusterMembership} dedupes by nodeUid and the
 * channel holds a single message handler — so the L3 datapath and the L4 tunnel
 * cannot each own the raw channel. The mux takes sole ownership of the channel's
 * `onMessage`, tags every outbound message with a one-byte {@link ClusterMuxKind},
 * and dispatches each inbound message to the sub-channel registered for its kind.
 *
 * Each {@link ClusterPeerMux.channel} returns an {@link IClusterMessageChannel} that
 * looks to its owner like a private peer link: `send` prepends the kind, and
 * `onMessage` receives only messages of that kind (with the kind byte stripped).
 * Both sides of a link must agree on the kind mapping, which they do by sharing
 * this enum.
 */
export class ClusterPeerMux {

    private readonly _channel: ClusterPeerChannel;

    private readonly _handlers: Map<number, (payload: Uint8Array) => void> = new Map();

    /**
     * @param channel - the authenticated peer channel to multiplex over
     */
    public constructor(channel: ClusterPeerChannel) {
        this._channel = channel;
        this._channel.onMessage((message: Uint8Array): void => this._dispatch(message));
    }

    /**
     * A logical sub-channel for one subsystem. Messages sent over it are tagged with
     * `kind`; only inbound messages of `kind` reach its handler. Calling this twice
     * for the same kind replaces the previous handler (one owner per kind).
     * @param kind - the subsystem this sub-channel carries
     */
    public channel(kind: ClusterMuxKind): IClusterMessageChannel {
        return {
            send: (message: Uint8Array): void => this._send(kind, message),
            onMessage: (handler: (message: Uint8Array) => void): void => {
                this._handlers.set(kind, handler);
            }
        };
    }

    /**
     * Register the close handler of the underlying peer channel.
     * @param handler - called once when the peer link closes
     */
    public onClose(handler: () => void): void {
        this._channel.onClose(handler);
    }

    /**
     * Close the underlying peer channel.
     */
    public close(): void {
        this._channel.close();
    }

    /**
     * Prefix a message with its kind and send it over the peer channel.
     * @param kind - the subsystem tag
     * @param message - the payload bytes
     */
    private _send(kind: ClusterMuxKind, message: Uint8Array): void {
        const framed = new Uint8Array(message.length + 1);
        framed[0] = kind;
        framed.set(message, 1);

        this._channel.send(framed);
    }

    /**
     * Route one inbound message to the sub-channel registered for its kind. An empty
     * message, or one whose kind has no registered handler, is dropped.
     * @param message - the raw inbound message (kind byte first)
     */
    private _dispatch(message: Uint8Array): void {
        if (message.length < 1) {
            return;
        }

        const handler = this._handlers.get(message[0]);

        if (handler !== undefined) {
            handler(message.subarray(1));
        }
    }

}