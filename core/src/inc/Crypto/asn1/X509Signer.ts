import {webcrypto} from 'crypto';
import {Der} from './Der.js';
import {DerReader} from './DerReader.js';
import {X509Der} from './X509Der.js';

/**
 * Signature algorithm for the own PKI signer: Ed25519 (primary) or ECDSA P-256
 * with SHA-256 (fallback).
 */
export type X509SignAlgorithm = 'ed25519' | 'p256';

const ED25519_SIG_OID = '1.3.101.112';
const ECDSA_SHA256_SIG_OID = '1.2.840.10045.4.3.2';
const P256_FIELD_BYTES = 32;

/**
 * Signs and verifies X.509 certificates for the FlyingFish own PKI library
 * (own-pki-lib slice 4) over Node WebCrypto. Ed25519 signatures are the raw
 * 64-byte value; ECDSA P-256 signatures are converted between WebCrypto's IEEE
 * P1363 (r||s) form and the X.509 DER ECDSA-Sig-Value SEQUENCE{r,s}. Turning a
 * TBSCertificate (from {@link X509Der}) into a signed Certificate closes the loop
 * to real, interoperable certificates.
 */
export class X509Signer {

    /**
     * Sign a TBSCertificate and return the complete Certificate DER.
     * @param tbsCertificate - the encoded TBSCertificate
     * @param signingKey - the issuer's private key
     * @param algorithm - the signature algorithm
     */
    public static async signCertificate(
        tbsCertificate: Uint8Array,
        signingKey: webcrypto.CryptoKey,
        algorithm: X509SignAlgorithm
    ): Promise<Uint8Array> {
        const signature = await X509Signer._sign(tbsCertificate, signingKey, algorithm);

        return X509Der.certificate(tbsCertificate, X509Signer.signatureAlgorithm(algorithm), signature);
    }

    /**
     * The AlgorithmIdentifier for a signature algorithm (also used as the TBS
     * `signature` field, which must match the outer one).
     * @param algorithm - the signature algorithm
     */
    public static signatureAlgorithm(algorithm: X509SignAlgorithm): Uint8Array {
        return X509Der.algorithmIdentifier(algorithm === 'p256' ? ECDSA_SHA256_SIG_OID : ED25519_SIG_OID);
    }

    /**
     * Verify a Certificate's signature over its TBS using the issuer's public
     * key. Returns false on a malformed certificate or a bad signature.
     * @param certificateDer - the Certificate DER
     * @param issuerPublicKey - the issuer's public key
     * @param algorithm - the signature algorithm
     */
    public static async verifyCertificate(
        certificateDer: Uint8Array,
        issuerPublicKey: webcrypto.CryptoKey,
        algorithm: X509SignAlgorithm
    ): Promise<boolean> {
        try {
            const cert = DerReader.parse(certificateDer);

            if (cert.children.length < 3) {
                return false;
            }

            const tbs = cert.children[0].raw;
            const signature = DerReader.toBitString(cert.children[2]).bytes;

            return await X509Signer._verify(tbs, signature, issuerPublicKey, algorithm);
        } catch {
            return false;
        }
    }

    /**
     * Sign bytes, returning the signature in its X.509 form (Ed25519 raw / ECDSA
     * DER SEQUENCE{r,s}).
     * @param data - the bytes to sign
     * @param key - the private key
     * @param algorithm - the signature algorithm
     */
    private static async _sign(
        data: Uint8Array,
        key: webcrypto.CryptoKey,
        algorithm: X509SignAlgorithm
    ): Promise<Uint8Array> {
        const raw = new Uint8Array(await webcrypto.subtle.sign(X509Signer._params(algorithm), key, data));

        return algorithm === 'p256' ? X509Signer._ecdsaRawToDer(raw) : raw;
    }

    /**
     * Verify a signature (in its X.509 form) over the data.
     * @param data - the signed bytes
     * @param signature - the signature in X.509 form
     * @param key - the public key
     * @param algorithm - the signature algorithm
     */
    private static async _verify(
        data: Uint8Array,
        signature: Uint8Array,
        key: webcrypto.CryptoKey,
        algorithm: X509SignAlgorithm
    ): Promise<boolean> {
        const raw = algorithm === 'p256' ? X509Signer._ecdsaDerToRaw(signature) : signature;

        return webcrypto.subtle.verify(X509Signer._params(algorithm), key, raw, data);
    }

    /**
     * The WebCrypto sign/verify parameters for a signature algorithm.
     * @param algorithm - the signature algorithm
     */
    private static _params(algorithm: X509SignAlgorithm): webcrypto.EcdsaParams | webcrypto.Algorithm {
        if (algorithm === 'p256') {
            return {name: 'ECDSA', hash: 'SHA-256'};
        }

        return {name: 'Ed25519'};
    }

    /**
     * Convert a WebCrypto ECDSA signature (P1363 r||s) to the X.509 DER
     * ECDSA-Sig-Value SEQUENCE{r,s}.
     * @param raw - the P1363 signature (r||s)
     */
    private static _ecdsaRawToDer(raw: Uint8Array): Uint8Array {
        const r = raw.subarray(0, P256_FIELD_BYTES);
        const s = raw.subarray(P256_FIELD_BYTES);

        return Der.sequence([Der.integerFromBytes(r), Der.integerFromBytes(s)]);
    }

    /**
     * Convert an X.509 DER ECDSA-Sig-Value SEQUENCE{r,s} to WebCrypto's P1363
     * r||s form (each coordinate left-padded to the field size).
     * @param der - the DER ECDSA-Sig-Value
     */
    private static _ecdsaDerToRaw(der: Uint8Array): Uint8Array {
        const node = DerReader.parse(der);
        const r = X509Signer._leftPad(node.children[0].content, P256_FIELD_BYTES);
        const s = X509Signer._leftPad(node.children[1].content, P256_FIELD_BYTES);

        return Der.concat([r, s]);
    }

    /**
     * Strip any leading zero padding and left-pad the value to `size` bytes.
     * @param bytes - the value bytes
     * @param size - the target size
     */
    private static _leftPad(bytes: Uint8Array, size: number): Uint8Array {
        let value = bytes;

        while (value.length > size && value[0] === 0x00) {
            value = value.subarray(1);
        }

        if (value.length === size) {
            return value;
        }

        const out = new Uint8Array(size);
        out.set(value, size - value.length);

        return out;
    }

}