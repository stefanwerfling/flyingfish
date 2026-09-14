import {DerReader} from './DerReader.js';
import {X509Signer} from './X509Signer.js';

const MAX_CHAIN_DEPTH = 10;
const TBS_ISSUER_INDEX = 3;
const TBS_SUBJECT_INDEX = 5;

/**
 * Builds and verifies certificate chains for the FlyingFish own PKI library
 * (own-pki-lib slice 7b), on top of {@link X509Signer.verifyIssuedBy}. This is the
 * own-lib replacement for @peculiar's X509ChainBuilder + the signature chain check
 * in PkiClientCertVerifier: link a leaf up through a pool of CA certificates to a
 * self-signed root. Signature + structure only (issuer DN links + each signature
 * verifies) — validity dates, SAN identity and revocation stay with the caller.
 * Assumes v3 certificates (a version [0] field).
 */
export class X509Chain {

    /**
     * Build the ordered chain (leaf first) from a leaf up through the CA pool
     * towards a self-signed root. Best-effort: stops at a self-signed certificate,
     * when no issuer is found, or at the depth cap, returning what it has. A
     * candidate is used at most once, so a cross-signing cycle cannot loop.
     * @param leafDer - the leaf certificate DER
     * @param caPool - the pool of CA certificate DERs to chain through
     */
    public static async build(leafDer: Uint8Array, caPool: Uint8Array[]): Promise<Uint8Array[]> {
        const chain = [leafDer];
        const used = new Set<number>();
        let current = leafDer;

        // Each hop depends on the previous one, so the walk is intrinsically
        // sequential (await-in-loop is correct here, not an accident).
        for (let depth = 0; depth < MAX_CHAIN_DEPTH; depth += 1) {
            // eslint-disable-next-line no-await-in-loop
            if (await X509Chain._isSelfSigned(current)) {
                break;
            }

            // eslint-disable-next-line no-await-in-loop
            const issuerIndex = await X509Chain._findIssuer(current, caPool, used);

            if (issuerIndex === -1) {
                break;
            }

            used.add(issuerIndex);
            chain.push(caPool[issuerIndex]);
            current = caPool[issuerIndex];
        }

        return chain;
    }

    /**
     * Verify that a leaf chains to a trusted root through the CA pool: the chain is
     * at least leaf + root, every certificate is signed by the next one up, and the
     * top is a self-signed root present in the pool.
     * @param leafDer - the leaf certificate DER
     * @param caPool - the trusted CA certificate DERs
     */
    public static async verify(leafDer: Uint8Array, caPool: Uint8Array[]): Promise<boolean> {
        const chain = await X509Chain.build(leafDer, caPool);

        if (chain.length < 2) {
            return false;
        }

        // every certificate must be signed by the next one up (checked in parallel)
        const links = await Promise.all(
            chain.slice(0, -1).map((cert, index) => X509Signer.verifyIssuedBy(cert, chain[index + 1]))
        );

        if (links.some((ok) => !ok)) {
            return false;
        }

        const root = chain[chain.length - 1];

        if (!await X509Chain._isSelfSigned(root)) {
            return false;
        }

        return X509Chain._poolContains(caPool, root);
    }

    /**
     * The first CA-pool index whose subject issued the certificate (subject DN
     * equals the cert's issuer DN and its key verifies the signature), skipping
     * already-used candidates, or -1.
     * @param certDer - the certificate whose issuer is sought
     * @param caPool - the pool of CA certificate DERs
     * @param used - indices already placed in the chain
     */
    private static async _findIssuer(
        certDer: Uint8Array,
        caPool: Uint8Array[],
        used: Set<number>
    ): Promise<number> {
        const issuer = X509Chain._name(certDer, TBS_ISSUER_INDEX);

        for (let index = 0; index < caPool.length; index += 1) {
            if (used.has(index) || !X509Chain._equal(issuer, X509Chain._name(caPool[index], TBS_SUBJECT_INDEX))) {
                continue;
            }

            // sequential so the search short-circuits on the first valid issuer
            // eslint-disable-next-line no-await-in-loop
            if (await X509Signer.verifyIssuedBy(certDer, caPool[index])) {
                return index;
            }
        }

        return -1;
    }

    /**
     * Whether a certificate is self-signed: its subject DN equals its issuer DN and
     * its own key verifies its signature.
     * @param certDer - the certificate DER
     */
    private static async _isSelfSigned(certDer: Uint8Array): Promise<boolean> {
        const subject = X509Chain._name(certDer, TBS_SUBJECT_INDEX);
        const issuer = X509Chain._name(certDer, TBS_ISSUER_INDEX);

        return X509Chain._equal(subject, issuer) && await X509Signer.verifyIssuedBy(certDer, certDer);
    }

    /**
     * The raw DER bytes of a Name field (issuer or subject) in a v3 certificate's
     * TBSCertificate.
     * @param certDer - the certificate DER
     * @param index - the TBS child index (issuer or subject)
     */
    private static _name(certDer: Uint8Array, index: number): Uint8Array {
        return DerReader.parse(certDer).children[0].children[index].raw;
    }

    /**
     * Whether the CA pool contains the given certificate (by DER equality).
     * @param caPool - the pool of CA certificate DERs
     * @param certDer - the certificate to look for
     */
    private static _poolContains(caPool: Uint8Array[], certDer: Uint8Array): boolean {
        return caPool.some((candidate) => X509Chain._equal(candidate, certDer));
    }

    /**
     * Byte-equality of two DER buffers.
     * @param a - the first buffer
     * @param b - the second buffer
     */
    private static _equal(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length !== b.length) {
            return false;
        }

        for (let index = 0; index < a.length; index += 1) {
            if (a[index] !== b[index]) {
                return false;
            }
        }

        return true;
    }

}