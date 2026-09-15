import * as tls from 'tls';
import {Pem} from '../Crypto/asn1/Pem.js';
import {PkiCaPurpose} from '../Pki/PkiCaTree.js';
import {PkiClientCertVerifier, PkiVerifiedIdentity} from '../Pki/PkiClientCertVerifier.js';
import {ClusterPeerChannel} from './ClusterPeerChannel.js';

/**
 * Options for {@link ClusterTlsPeerTransport}: this node's own cluster identity
 * (certificate + private key) and the trusted cluster CA chain to verify peers.
 */
export type ClusterPeerTransportOptions = {
    certificate: string;
    privateKey: string;
    caChain: string[];
};

/**
 * Called with each newly-accepted, authenticated inbound peer channel.
 */
export type ClusterPeerHandler = (channel: ClusterPeerChannel) => void;

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
export class ClusterTlsPeerTransport {

    private readonly _options: ClusterPeerTransportOptions;

    private _server: tls.Server | null = null;

    /**
     * @param options - this node's cluster identity + the trusted CA chain
     */
    public constructor(options: ClusterPeerTransportOptions) {
        this._options = options;
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
            ClusterTlsPeerTransport._admit(socket, this._options.caChain, onPeer).catch((): void => {
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
                ClusterTlsPeerTransport._authenticate(socket, this._options.caChain).then((identity): void => {
                    if (identity === null) {
                        socket.destroy();
                        reject(new Error('ClusterTlsPeerTransport: peer identity not trusted'));
                    } else {
                        resolve(new ClusterPeerChannel(socket, identity));
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
     * @param socket - the inbound TLS socket
     * @param caChain - the trusted cluster CA chain
     * @param onPeer - the accepted-peer handler
     */
    private static async _admit(socket: tls.TLSSocket, caChain: string[], onPeer: ClusterPeerHandler): Promise<void> {
        const identity = await ClusterTlsPeerTransport._authenticate(socket, caChain);

        if (identity === null) {
            socket.destroy();
            return;
        }

        onPeer(new ClusterPeerChannel(socket, identity));
    }

    /**
     * Verify the socket's peer certificate against the cluster CA chain and return
     * its identity, but only for a cluster-purpose identity (a service/device cert
     * cannot join the mesh). Returns null otherwise.
     * @param socket - the TLS socket
     * @param caChain - the trusted cluster CA chain
     */
    private static async _authenticate(socket: tls.TLSSocket, caChain: string[]): Promise<PkiVerifiedIdentity | null> {
        const peer = socket.getPeerCertificate();

        if (peer === null || peer.raw === undefined || peer.raw.length === 0) {
            return null;
        }

        const identity = await PkiClientCertVerifier.verify(Pem.encode(Pem.CERTIFICATE, new Uint8Array(peer.raw)), caChain);

        if (identity === null || identity.purpose !== PkiCaPurpose.cluster) {
            return null;
        }

        return identity;
    }

}