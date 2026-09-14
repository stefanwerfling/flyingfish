import {Pem} from '../Crypto/asn1/Pem.js';
import {X509Chain} from '../Crypto/asn1/X509Chain.js';
import {X509Reader} from '../Crypto/asn1/X509Reader.js';
import {PkiCaPurpose} from './PkiCaTree.js';
import {PkiRevocationList} from './PkiRevocationList.js';

const IDENTITY_URI = /^flyingfish:\/\/([a-z]+)\/(.+)$/u;

/**
 * The identity extracted from a verified client certificate: the CA purpose it
 * was issued under and its stable nodeUid (from the flyingfish://<purpose>/<uid>
 * SAN URI).
 */
export type PkiVerifiedIdentity = {
    nodeUid: string;
    purpose: PkiCaPurpose;
};

/**
 * Options for {@link PkiClientCertVerifier.verify}.
 */
export type PkiClientCertVerifyOptions = {
    /**
     * The instant to check validity against (epoch ms). Defaults to now.
     */
    now?: number;

    /**
     * If given, a certificate whose nodeUid is revoked is rejected.
     */
    revocationList?: PkiRevocationList;
};

/**
 * Verifies a peer's client certificate for mTLS part authentication (own-PKI
 * epic 9.4 — the goal that replaces the shared registry secret). A part proves
 * who it is by presenting a certificate this CA issued; the Hub verifies the
 * chain, the validity window and (optionally) that the identity is not revoked,
 * then reads the stable node identity from the SAN. Pure crypto — no network, no
 * clock of its own — so it is deterministic and testable. Built on the FlyingFish
 * own PKI library (own-pki-lib slice 7).
 */
export class PkiClientCertVerifier {

    /**
     * Verify a client certificate against the CA chain and return its identity,
     * or null if it does not chain to a trusted root, is outside its validity
     * window, carries no FlyingFish identity SAN, or is revoked.
     * @param clientCertPem - the peer's leaf certificate PEM
     * @param caChain - the trusted CA certificates ([intermediate, root])
     * @param options - validity clock + optional revocation list
     */
    public static async verify(
        clientCertPem: string,
        caChain: string[],
        options: PkiClientCertVerifyOptions = {}
    ): Promise<PkiVerifiedIdentity | null> {
        let certDer: Uint8Array;

        try {
            certDer = Pem.decode(clientCertPem);
        } catch {
            return null;
        }

        const now = options.now ?? Date.now();

        if (!await PkiClientCertVerifier._isValid(certDer, caChain, now)) {
            return null;
        }

        const identity = PkiClientCertVerifier._identityFromSan(certDer);

        if (identity === null) {
            return null;
        }

        if (options.revocationList && options.revocationList.isRevoked(identity.nodeUid)) {
            return null;
        }

        return identity;
    }

    /**
     * Whether the certificate is within its validity window and chains to a
     * trusted, self-signed root in the CA pool. Any parse error means invalid.
     * @param certDer - the leaf certificate DER
     * @param caChain - the trusted CA certificate PEMs
     * @param now - the instant to check validity against (epoch ms)
     */
    private static async _isValid(certDer: Uint8Array, caChain: string[], now: number): Promise<boolean> {
        try {
            const validity = X509Reader.validity(certDer);

            if (now < validity.notBefore.getTime() || now > validity.notAfter.getTime()) {
                return false;
            }

            return await X509Chain.verify(certDer, caChain.map((pem) => Pem.decode(pem)));
        } catch {
            return false;
        }
    }

    /**
     * Extract the FlyingFish node identity from the certificate's SAN URIs, or
     * null if none carries a valid flyingfish://<purpose>/<nodeUid> value.
     * @param certDer - the leaf certificate DER
     */
    private static _identityFromSan(certDer: Uint8Array): PkiVerifiedIdentity | null {
        const values = X509Reader.subjectAltNames(certDer).filter((entry) => entry.type === 'url').map((entry) => entry.value);
        const purposes = Object.values(PkiCaPurpose) as string[];

        for (const value of values) {
            const match = IDENTITY_URI.exec(value);

            if (match !== null && purposes.includes(match[1])) {
                return {
                    purpose: match[1] as PkiCaPurpose,
                    nodeUid: match[2]
                };
            }
        }

        return null;
    }

}