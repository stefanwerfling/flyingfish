import * as x509 from '@peculiar/x509';
import {PkiCaPurpose} from './PkiCaTree.js';
import {PkiCertificateBuilder} from '../Crypto/PkiCertificateBuilder.js';
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
 * clock of its own — so it is deterministic and testable.
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
        let cert: x509.X509Certificate;

        try {
            cert = new x509.X509Certificate(clientCertPem);
        } catch {
            return null;
        }

        const now = options.now ?? Date.now();

        if (now < cert.notBefore.getTime() || now > cert.notAfter.getTime()) {
            return null;
        }

        if (!await PkiClientCertVerifier._verifyChain(clientCertPem, caChain)) {
            return null;
        }

        const identity = PkiClientCertVerifier._identityFromSan(cert);

        if (identity === null) {
            return null;
        }

        if (options.revocationList && options.revocationList.isRevoked(identity.nodeUid)) {
            return null;
        }

        return identity;
    }

    /**
     * Verify the leaf chains, link by link, up to a self-signed root that is in
     * the trusted CA pool.
     * @param leafPem - the leaf certificate PEM
     * @param caChain - the trusted CA certificate PEMs
     */
    private static async _verifyChain(leafPem: string, caChain: string[]): Promise<boolean> {
        try {
            const chain = await PkiCertificateBuilder.buildChain(leafPem, caChain);

            if (chain.length < 2) {
                return false;
            }

            // every certificate must be signed by the next one up the chain
            const links = chain.slice(0, -1).map((cert, index) => {
                return {cert: cert, issuer: chain[index + 1]};
            });

            const linkResults = await Promise.all(
                links.map((link) => PkiCertificateBuilder.verifyIssuedBy(link.cert, link.issuer))
            );

            if (linkResults.some((ok) => !ok)) {
                return false;
            }

            // the top of the chain must be a self-signed root present in the pool
            const root = chain[chain.length - 1];
            const rootSelfSigned = await PkiCertificateBuilder.verifyIssuedBy(root, root);

            return rootSelfSigned && PkiClientCertVerifier._poolContains(caChain, root);
        } catch {
            return false;
        }
    }

    /**
     * Whether the CA pool contains the given certificate (by DER equality).
     * @param caChain - the trusted CA certificate PEMs
     * @param certPem - the certificate PEM to look for
     */
    private static _poolContains(caChain: string[], certPem: string): boolean {
        const target = Buffer.from(new x509.X509Certificate(certPem).rawData).toString('base64');

        return caChain.some((pem) => {
            return Buffer.from(new x509.X509Certificate(pem).rawData).toString('base64') === target;
        });
    }

    /**
     * Extract the FlyingFish node identity from the certificate's SAN URIs, or
     * null if none carries a valid flyingfish://<purpose>/<nodeUid> value.
     * @param cert - the parsed certificate
     */
    private static _identityFromSan(cert: x509.X509Certificate): PkiVerifiedIdentity | null {
        const san = cert.getExtension(x509.SubjectAlternativeNameExtension);
        const values = (san?.names.toJSON() ?? []).map((name) => name.value);
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