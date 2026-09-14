/**
 * Unit tests for the own-PKI signer (own-pki-lib slice 4). The key validation:
 * a certificate our library builds + signs is CROSS-VERIFIED by @peculiar/x509
 * (the reference implementation we intend to drop) — for Ed25519 and for ECDSA
 * P-256 (which exercises the P1363<->DER signature conversion). Our own
 * verifyCertificate agrees, and a tampered signature is rejected. Network-free.
 */
import * as x509 from '@peculiar/x509';
import {webcrypto} from 'crypto';
import {X509Der, X509Signer, X509SignAlgorithm} from 'flyingfish_core';

/**
 * Build a self-signed certificate with the own PKI library and return the cert
 * DER + the key pair that signed it.
 * @param algorithm - the signature algorithm
 */
const buildSelfSigned = async(
    algorithm: X509SignAlgorithm
): Promise<{keys: webcrypto.CryptoKeyPair; certDer: Uint8Array;}> => {
    const keyGen: webcrypto.Algorithm | webcrypto.EcKeyGenParams = algorithm === 'p256'
        ? {name: 'ECDSA', namedCurve: 'P-256'}
        : {name: 'Ed25519'};

    const keys = await webcrypto.subtle.generateKey(keyGen, true, ['sign', 'verify']) as webcrypto.CryptoKeyPair;
    const spki = new Uint8Array(await webcrypto.subtle.exportKey('spki', keys.publicKey));

    const name = X509Der.distinguishedName([{oid: '2.5.4.3', value: 'FlyingFish Root CA'}]);

    const tbs = X509Der.tbsCertificate({
        serialNumber: Uint8Array.of(0x01, 0x2a),
        signatureAlgorithm: X509Signer.signatureAlgorithm(algorithm),
        issuer: name,
        notBefore: new Date(Date.UTC(2024, 0, 1)),
        notAfter: new Date(Date.UTC(2039, 0, 1)),
        subject: name,
        subjectPublicKeyInfo: spki
    });

    const certDer = await X509Signer.signCertificate(tbs, keys.privateKey, algorithm);

    return {keys: keys, certDer: certDer};
};

describe('own PKI signer (own-pki-lib slice 4)', () => {
    test('an Ed25519 cert we sign is accepted by @peculiar and our own verify', async() => {
        const {keys, certDer} = await buildSelfSigned('ed25519');

        // cross-verify with the reference implementation (@peculiar/x509)
        const reference = new x509.X509Certificate(certDer);
        expect(await reference.verify({publicKey: keys.publicKey, signatureOnly: true})).toBe(true);

        // our own verifier agrees
        expect(await X509Signer.verifyCertificate(certDer, keys.publicKey, 'ed25519')).toBe(true);
    });

    test('an ECDSA P-256 cert we sign is accepted by @peculiar (P1363<->DER)', async() => {
        const {keys, certDer} = await buildSelfSigned('p256');

        const reference = new x509.X509Certificate(certDer);
        expect(await reference.verify({publicKey: keys.publicKey, signatureOnly: true})).toBe(true);

        expect(await X509Signer.verifyCertificate(certDer, keys.publicKey, 'p256')).toBe(true);
    });

    test('a tampered signature is rejected', async() => {
        const {keys, certDer} = await buildSelfSigned('ed25519');

        const tampered = Uint8Array.from(certDer);
        // change a trailing signature byte (structure stays intact)
        const last = tampered.length - 1;
        tampered[last] = (tampered[last] + 1) % 256;

        expect(await X509Signer.verifyCertificate(tampered, keys.publicKey, 'ed25519')).toBe(false);
    });
});