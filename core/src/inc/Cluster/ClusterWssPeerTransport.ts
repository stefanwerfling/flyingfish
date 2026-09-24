import * as http from 'http';
import * as https from 'https';
import * as tls from 'tls';
import {WebSocket, WebSocketServer} from 'ws';
import {ClusterBootstrapAcceptContext, ClusterDialBootstrap, ClusterPeerHandler, ClusterPeerTransportOptions, IClusterPeerTransport} from './ClusterPeerTransport.js';
import {ClusterBootstrapHandshake} from './ClusterBootstrapHandshake.js';
import {ClusterPeerAuthenticator} from './ClusterPeerAuthenticator.js';
import {ClusterPeerChannel} from './ClusterPeerChannel.js';
import {caChainRootFingerprint} from './ClusterCaAggregate.js';
import {WebSocketByteDuplex} from './WebSocketByteDuplex.js';

/**
 * The WSS/443 cluster peer transport (Cluster/Mesh epic 9.5.1, slice 3): the same
 * mutually-authenticated cluster channel as {@link ClusterTlsPeerTransport} but
 * carried inside a WebSocket over HTTPS. This is the NAT-/firewall-friendly
 * fallback — a peer that cannot reach another over the raw TLS port can still
 * connect over 443, where the traffic looks like ordinary HTTPS. Authentication is
 * identical (mutual TLS with a cluster node-cert, verified via
 * {@link ClusterPeerAuthenticator}); only the wire differs, so the resulting
 * {@link ClusterPeerChannel} — and everything above it — is transport-agnostic.
 * No native dependency, so it runs on a Raspberry Pi.
 */
export class ClusterWssPeerTransport implements IClusterPeerTransport {

    private readonly _options: ClusterPeerTransportOptions;

    private _server: https.Server | null = null;

    private _wss: WebSocketServer | null = null;

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
     * Listen for inbound WSS peer connections, authenticating each before handing up
     * a channel. Returns the bound port (pass 0 to get an OS-assigned one).
     * @param port - the TCP port to bind (0 = OS-assigned)
     * @param onPeer - called with each authenticated inbound peer channel
     */
    public async listen(port: number, onPeer: ClusterPeerHandler): Promise<number> {
        this._server = https.createServer({
            cert: this._options.certificate,
            key: this._options.privateKey,
            ca: this._options.caChain,
            requestCert: true,
            rejectUnauthorized: false
        });

        this._wss = new WebSocketServer({server: this._server});

        this._wss.on('connection', (ws: WebSocket, req: http.IncomingMessage): void => {
            const socket = req.socket as unknown as tls.TLSSocket;

            ClusterWssPeerTransport._admit(ws, socket, this._trust(), onPeer, this._options.bootstrap).catch((): void => {
                ws.terminate();
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
     * Connect to a peer over WSS, authenticating it before returning the channel.
     * @param host - the peer host
     * @param port - the peer port
     */
    public async connect(host: string, port: number): Promise<ClusterPeerChannel> {
        return new Promise<ClusterPeerChannel>((resolve, reject): void => {
            const ws = new WebSocket(`wss://${host}:${port}`, {
                cert: this._options.certificate,
                key: this._options.privateKey,
                ca: this._options.caChain,
                rejectUnauthorized: false
            });

            // The peer certificate lives on the underlying TLS socket, captured from
            // the HTTP upgrade response before the socket is handed to the WebSocket.
            let peerSocket: tls.TLSSocket | null = null;

            ws.on('upgrade', (response: http.IncomingMessage): void => {
                peerSocket = response.socket as unknown as tls.TLSSocket;
            });

            ws.on('open', (): void => {
                if (peerSocket === null) {
                    ws.terminate();
                    reject(new Error('ClusterWssPeerTransport: no TLS socket for the peer'));
                    return;
                }

                ClusterPeerAuthenticator.authenticate(peerSocket, this._trust()).then((identity): void => {
                    if (identity === null) {
                        ws.terminate();
                        reject(new Error('ClusterWssPeerTransport: peer identity not trusted'));
                    } else {
                        resolve(new ClusterPeerChannel(new WebSocketByteDuplex(ws), identity));
                    }
                }).catch(reject);
            });

            ws.once('error', reject);
        });
    }

    /**
     * The one-port bootstrap pre-flight (dialer side) over WSS: connect, exchange CA
     * chains + our join token, pin the peer's CA, hand it to the sink, then close.
     * Mirrors {@link ClusterTlsPeerTransport.bootstrap}. Returns true when the pin
     * matched (mutual trust material is in place for a normal re-dial).
     * @param host - the peer host
     * @param port - the peer port
     * @param dial - the dial-side bootstrap params
     */
    public async bootstrap(host: string, port: number, dial: ClusterDialBootstrap): Promise<boolean> {
        return new Promise<boolean>((resolve): void => {
            const ws = new WebSocket(`wss://${host}:${port}`, {
                cert: this._options.certificate,
                key: this._options.privateKey,
                ca: this._options.caChain,
                rejectUnauthorized: false
            });

            ws.on('open', (): void => {
                ClusterBootstrapHandshake.exchange(new WebSocketByteDuplex(ws), {caChain: dial.ownCaChain, token: dial.token}).then((peerHello): void => {
                    let trusted = false;

                    if (peerHello !== null && caChainRootFingerprint(peerHello.caChain) === dial.pinFingerprint) {
                        dial.onAcceptedCa(peerHello.caChain);
                        trusted = true;
                    }

                    ws.close();
                    resolve(trusted);
                }).catch((): void => {
                    ws.terminate();
                    resolve(false);
                });
            });

            ws.once('error', (): void => resolve(false));
        });
    }

    /**
     * Authenticate an inbound WSS peer and, if trusted, hand a channel to the handler.
     * An untrusted peer runs the one-port bootstrap pre-flight when a bootstrap context
     * is set (model (b) join), then the connection is closed gracefully so its HELLO
     * reply reaches the dialer; otherwise it is dropped.
     * @param ws - the inbound WebSocket
     * @param socket - its underlying TLS socket (peer cert)
     * @param caChain - the trusted cluster CA chain
     * @param onPeer - the accepted-peer handler
     * @param bootstrap - optional accept-side bootstrap context
     * @protected
     */
    protected static async _admit(
        ws: WebSocket,
        socket: tls.TLSSocket,
        caChain: string[],
        onPeer: ClusterPeerHandler,
        bootstrap?: ClusterBootstrapAcceptContext
    ): Promise<void> {
        const identity = await ClusterPeerAuthenticator.authenticate(socket, caChain);

        if (identity !== null) {
            onPeer(new ClusterPeerChannel(new WebSocketByteDuplex(ws), identity));

            return;
        }

        if (bootstrap !== undefined) {
            const peerHello = await ClusterBootstrapHandshake.exchange(new WebSocketByteDuplex(ws), {caChain: bootstrap.ownCaChain});

            if (peerHello !== null && peerHello.token !== undefined && await bootstrap.validateToken(peerHello.token)) {
                bootstrap.onAcceptedCa(peerHello.caChain);
            }

            // Graceful close flushes our HELLO reply to the dialer before the FIN.
            ws.close();

            return;
        }

        ws.terminate();
    }

    /**
     * Stop listening.
     */
    public async close(): Promise<void> {
        const wss = this._wss;

        if (wss !== null) {
            await new Promise<void>((resolve): void => {
                wss.close((): void => {
                    resolve();
                });
            });

            this._wss = null;
        }

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

}