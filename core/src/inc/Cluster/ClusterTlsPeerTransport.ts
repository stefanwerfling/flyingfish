import * as tls from 'tls';
import {ClusterBootstrapAcceptContext, ClusterDialBootstrap, ClusterPeerHandler, ClusterPeerTransportOptions, IClusterPeerTransport} from './ClusterPeerTransport.js';
import {ClusterBootstrapHandshake} from './ClusterBootstrapHandshake.js';
import {ClusterPeerAuthenticator} from './ClusterPeerAuthenticator.js';
import {ClusterPeerChannel} from './ClusterPeerChannel.js';
import {caChainRootFingerprint} from './ClusterCaAggregate.js';
import {TlsSocketDuplex} from './TlsSocketDuplex.js';

/**
 * The first cluster transport (Cluster/Mesh epic 9.5.1): a node↔node mutually
 * authenticated channel over TLS (Node's built-in `tls`, no extra dependency,
 * Raspberry-Pi friendly). Both sides present their cluster certificate and each
 * verifies the other's against the cluster CA chain — a peer is admitted only if
 * it presents a valid `flyingfish://cluster/<nodeUid>` identity. This is the
 * authenticated substrate the WSS/QUIC transports (9.5.8) and the TUN datapath
 * plug into later; rejectUnauthorized is off because identity is checked here
 * against the cluster SAN (not just chain validity) via {@link PkiClientCertVerifier}.
 */
export class ClusterTlsPeerTransport implements IClusterPeerTransport {

    private readonly _options: ClusterPeerTransportOptions;

    private _server: tls.Server | null = null;

    /**
     * @param options - this node's cluster identity + the trusted CA chain
     */
    public constructor(options: ClusterPeerTransportOptions) {
        this._options = options;
    }

    /**
     * The current trust anchor set: the live union of member CAs when a provider is
     * given (model (b) cross-trust), else this node's own static CA chain.
     */
    private _trust(): string[] {
        return this._options.trustProvider?.() ?? this._options.caChain;
    }

    /**
     * Listen for inbound peer connections, authenticating each before handing up a
     * channel. Returns the bound port (pass 0 to get an OS-assigned one).
     * @param port - the TCP port to bind (0 = OS-assigned)
     * @param onPeer - called with each authenticated inbound peer channel
     */
    public async listen(port: number, onPeer: ClusterPeerHandler): Promise<number> {
        this._server = tls.createServer({
            cert: this._options.certificate,
            key: this._options.privateKey,
            ca: this._options.caChain,
            requestCert: true,
            rejectUnauthorized: false
        }, (socket: tls.TLSSocket): void => {
            ClusterTlsPeerTransport._admit(socket, this._trust(), onPeer, this._options.bootstrap).catch((): void => {
                socket.destroy();
            });
        });

        const server = this._server;

        return new Promise<number>((resolve, reject): void => {
            server.once('error', reject);
            server.listen(port, (): void => {
                const address = server.address();
                resolve(typeof address === 'object' && address !== null ? address.port : port);
            });
        });
    }

    /**
     * Connect to a peer, authenticating it before returning the channel.
     * @param host - the peer host
     * @param port - the peer port
     */
    public async connect(host: string, port: number): Promise<ClusterPeerChannel> {
        return new Promise<ClusterPeerChannel>((resolve, reject): void => {
            const socket = tls.connect({
                host: host,
                port: port,
                cert: this._options.certificate,
                key: this._options.privateKey,
                ca: this._options.caChain,
                rejectUnauthorized: false
            }, (): void => {
                ClusterPeerAuthenticator.authenticate(socket, this._trust()).then((identity): void => {
                    if (identity === null) {
                        socket.destroy();
                        reject(new Error('ClusterTlsPeerTransport: peer identity not trusted'));
                    } else {
                        resolve(new ClusterPeerChannel(new TlsSocketDuplex(socket), identity));
                    }
                }).catch(reject);
            });

            socket.once('error', reject);
        });
    }

    /**
     * Stop listening.
     */
    public async close(): Promise<void> {
        const server = this._server;

        if (server !== null) {
            await new Promise<void>((resolve): void => {
                server.close((): void => {
                    resolve();
                });
            });

            this._server = null;
        }
    }

    /**
     * Authenticate an inbound socket and, if trusted, hand a channel to the handler.
     * An untrusted peer is dropped — unless a bootstrap context is set, in which case
     * the one-port bootstrap pre-flight runs first (model (b) join) so the peer's next
     * connection can authenticate.
     * @param socket - the inbound TLS socket
     * @param caChain - the trusted cluster CA chain
     * @param onPeer - the accepted-peer handler
     * @param bootstrap - optional accept-side bootstrap context
     */
    private static async _admit(
        socket: tls.TLSSocket,
        caChain: string[],
        onPeer: ClusterPeerHandler,
        bootstrap?: ClusterBootstrapAcceptContext
    ): Promise<void> {
        const identity = await ClusterPeerAuthenticator.authenticate(socket, caChain);

        if (identity !== null) {
            onPeer(new ClusterPeerChannel(new TlsSocketDuplex(socket), identity));

            return;
        }

        if (bootstrap !== undefined) {
            await ClusterTlsPeerTransport._acceptBootstrap(socket, bootstrap);

            // Graceful close: flush our HELLO to the peer before the FIN, so the dialer
            // reliably receives it (a forceful destroy would drop the buffered reply).
            socket.end();

            return;
        }

        socket.destroy();
    }

    /**
     * Run the accept side of the one-port bootstrap exchange on an untrusted inbound
     * socket: send our CA, read the peer's HELLO, and — only if it carries a valid
     * join token — hand its CA up to be added to the bootstrap trust set. The socket
     * is always closed afterwards (the peer re-dials normally to form the mesh).
     * @param socket - the untrusted inbound socket
     * @param bootstrap - the accept-side bootstrap context
     * @protected
     */
    protected static async _acceptBootstrap(socket: tls.TLSSocket, bootstrap: ClusterBootstrapAcceptContext): Promise<void> {
        const peerHello = await ClusterBootstrapHandshake.exchange(new TlsSocketDuplex(socket), {caChain: bootstrap.ownCaChain});

        if (peerHello !== null && peerHello.token !== undefined && await bootstrap.validateToken(peerHello.token)) {
            bootstrap.onAcceptedCa(peerHello.caChain);
        }
    }

    /**
     * The one-port bootstrap pre-flight (dialer side): dial the peer, exchange CA
     * chains + our join token, pin the peer's CA against the expected fingerprint,
     * hand the pinned CA to the sink, then close. Returns true only when the pin
     * matched (mutual trust material is now in place for a normal re-dial).
     * @param host - the peer host
     * @param port - the peer port
     * @param dial - the dial-side bootstrap params
     */
    public async bootstrap(host: string, port: number, dial: ClusterDialBootstrap): Promise<boolean> {
        return new Promise<boolean>((resolve): void => {
            const socket = tls.connect({
                host: host,
                port: port,
                cert: this._options.certificate,
                key: this._options.privateKey,
                ca: this._options.caChain,
                rejectUnauthorized: false
            }, (): void => {
                ClusterBootstrapHandshake.exchange(new TlsSocketDuplex(socket), {caChain: dial.ownCaChain, token: dial.token}).then((peerHello): void => {
                    let trusted = false;

                    if (peerHello !== null && caChainRootFingerprint(peerHello.caChain) === dial.pinFingerprint) {
                        dial.onAcceptedCa(peerHello.caChain);
                        trusted = true;
                    }

                    socket.destroy();
                    resolve(trusted);
                }).catch((): void => {
                    socket.destroy();
                    resolve(false);
                });
            });

            socket.once('error', (): void => resolve(false));
        });
    }

}