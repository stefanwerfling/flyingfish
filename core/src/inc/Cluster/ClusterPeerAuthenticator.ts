import * as tls from 'tls';
import {Pem} from '../Crypto/asn1/Pem.js';
import {PkiCaPurpose} from '../Pki/PkiCaTree.js';
import {PkiClientCertVerifier, PkiVerifiedIdentity} from '../Pki/PkiClientCertVerifier.js';

/**
 * The shared peer admission check for every cluster transport (Cluster/Mesh epic
 * 9.5.1). Both the TCP-TLS and the WSS/443 transports run mutual TLS with
 * `rejectUnauthorized` off and enforce identity here instead: a peer is admitted
 * only if its presented certificate verifies against the cluster CA chain AND
 * carries a `cluster`-purpose identity (a service/device cert cannot join the
 * mesh). Keeping this in one place means both transports authenticate identically.
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

        const identity = await PkiClientCertVerifier.verify(
            Pem.encode(Pem.CERTIFICATE, new Uint8Array(peer.raw)),
            caChain
        );

        if (identity === null || identity.purpose !== PkiCaPurpose.cluster) {
            return null;
        }

        return identity;
    }

}