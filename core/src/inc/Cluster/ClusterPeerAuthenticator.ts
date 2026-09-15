import * as tls from 'tls';
import {Pem} from '../Crypto/asn1/Pem.js';
import {PkiCaPurpose} from '../Pki/PkiCaTree.js';
import {PkiClientCertVerifier, PkiVerifiedIdentity} from '../Pki/PkiClientCertVerifier.js';

/**
 * The shared peer admission check for every cluster transport (Cluster/Mesh epic
 * 9.5.1). The TCP-TLS, WSS/443 and QUIC transports all run mutual TLS with chain
 * validation left off and enforce identity here instead: a peer is admitted only
 * if its presented certificate verifies against the cluster CA chain AND carries a
 * `cluster`-purpose identity (a service/device cert cannot join the mesh). Keeping
 * this in one place means every transport authenticates identically, whether it
 * hands over a TLS socket (TCP/WSS) or a PEM certificate (QUIC).
 */
export class ClusterPeerAuthenticator {

    /**
     * Verify a TLS socket's peer certificate against the cluster CA chain and return
     * its cluster identity, or null if untrusted or not a cluster-purpose identity.
     * @param socket - the (mutually) TLS-authenticated socket
     * @param caChain - the trusted cluster CA chain
     */
    public static async authenticate(socket: tls.TLSSocket, caChain: string[]): Promise<PkiVerifiedIdentity | null> {
        const peer = socket.getPeerCertificate();

        if (peer === null || peer.raw === undefined || peer.raw.length === 0) {
            return null;
        }

        return ClusterPeerAuthenticator.authenticatePem(Pem.encode(Pem.CERTIFICATE, new Uint8Array(peer.raw)), caChain);
    }

    /**
     * Verify a peer's leaf certificate (PEM) against the cluster CA chain and return
     * its cluster identity, or null if untrusted or not a cluster-purpose identity.
     * Used by the QUIC transport, whose native layer surfaces the peer certificate
     * as PEM rather than a TLS socket.
     * @param certPem - the peer's leaf certificate, PEM-encoded
     * @param caChain - the trusted cluster CA chain
     */
    public static async authenticatePem(certPem: string, caChain: string[]): Promise<PkiVerifiedIdentity | null> {
        if (certPem.length === 0) {
            return null;
        }

        const identity = await PkiClientCertVerifier.verify(certPem, caChain);

        if (identity === null || identity.purpose !== PkiCaPurpose.cluster) {
            return null;
        }

        return identity;
    }

}