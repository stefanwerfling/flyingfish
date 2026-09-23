import {ClusterPeerAuthenticator} from './ClusterPeerAuthenticator.js';
import {ClusterPeerChannel} from './ClusterPeerChannel.js';
import {ClusterPeerHandler, ClusterPeerTransportOptions, IClusterPeerTransport} from './ClusterPeerTransport.js';
import {QuicNativeBinding, QuicNativePeer, QuicNativeTransport} from './ClusterQuicNativeBinding.js';
import {QuicStreamDuplex} from './QuicStreamDuplex.js';

/**
 * The QUIC cluster peer transport (Cluster/Mesh epic 9.5.1): the primary,
 * NAT-friendly, connection-migrating transport, built on FlyingFish's own native
 * QUIC binding (quinn + rustls) behind the same {@link IClusterPeerTransport} shape
 * as the TCP-TLS and WSS transports. The native layer does the QUIC I/O and mutual
 * TLS but leaves chain validation off; this JS layer runs the shared
 * {@link ClusterPeerAuthenticator} on the surfaced peer certificate (verify against
 * the cluster CA + require the `flyingfish://cluster/<nodeUid>` purpose), then wraps
 * each peer's QUIC bi-stream in a {@link QuicStreamDuplex} → {@link ClusterPeerChannel},
 * so everything above the transport is unchanged. The native addon is injected, so
 * `core` never hard-depends on the native package.
 */
export class ClusterQuicPeerTransport implements IClusterPeerTransport {

    private readonly _native: QuicNativeTransport;

    private readonly _caChain: string[];

    private readonly _trustProvider?: () => string[];

    private _accepting = false;

    /**
     * @param options - this node's cluster identity + the trusted CA chain
     * @param binding - the loaded native QUIC addon
     */
    public constructor(options: ClusterPeerTransportOptions, binding: QuicNativeBinding) {
        this._native = new binding.QuicTransport(options.certificate, options.privateKey);
        this._caChain = options.caChain;
        this._trustProvider = options.trustProvider;
    }

    /**
     * The current trust anchor set: the live union of member CAs when a provider is
     * given (model (b) cross-trust), else this node's own static CA chain.
     */
    private _trust(): string[] {
        return this._trustProvider?.() ?? this._caChain;
    }

    /**
     * Listen for inbound QUIC peers, authenticating each before handing up a channel.
     * Returns the bound port (pass 0 for an OS-assigned one).
     * @param port - the UDP port to bind (0 = OS-assigned)
     * @param onPeer - called with each authenticated inbound peer channel
     */
    public async listen(port: number, onPeer: ClusterPeerHandler): Promise<number> {
        const bound = await this._native.listen(port);
        this._accepting = true;
        this._acceptLoop(onPeer).catch((): void => undefined);

        return bound;
    }

    /**
     * Connect to a peer over QUIC, authenticating it before returning the channel.
     * @param host - the peer host
     * @param port - the peer port
     */
    public async connect(host: string, port: number): Promise<ClusterPeerChannel> {
        const peer = await this._native.connect(host, port);
        const channel = await this._admit(peer);

        if (channel === null) {
            peer.close();
            throw new Error('ClusterQuicPeerTransport: peer identity not trusted');
        }

        return channel;
    }

    /**
     * Stop listening and close the endpoints.
     */
    public async close(): Promise<void> {
        this._accepting = false;
        await this._native.close();
    }

    /**
     * Accept inbound peers until the endpoint closes (acceptPeer then rejects).
     * @param onPeer - the accepted-peer handler
     */
    private async _acceptLoop(onPeer: ClusterPeerHandler): Promise<void> {
        while (this._accepting) {
            let peer: QuicNativePeer;

            try {
                // eslint-disable-next-line no-await-in-loop -- sequential accept
                peer = await this._native.acceptPeer();
            } catch {
                break;
            }

            // eslint-disable-next-line no-await-in-loop -- authenticate before the next accept
            const channel = await this._admit(peer).catch((): null => null);

            if (channel === null) {
                peer.close();
            } else {
                onPeer(channel);
            }
        }
    }

    /**
     * Authenticate a native peer and, if trusted, wrap it in a channel.
     * @param peer - the native QUIC peer
     */
    private async _admit(peer: QuicNativePeer): Promise<ClusterPeerChannel | null> {
        const identity = await ClusterPeerAuthenticator.authenticatePem(peer.peerCertPem, this._trust());

        if (identity === null) {
            return null;
        }

        return new ClusterPeerChannel(new QuicStreamDuplex(peer), identity);
    }

}