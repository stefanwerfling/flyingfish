/**
 * Unit tests for the rest of own-pki-lib slice 5: the PKCS#10 CSR (sign + verify)
 * and verifyIssuedBy (the signature-only chain primitive the CA-tree/enrollment
 * code migrates onto in slice 7). A CSR our library builds carries its subject and
 * its self-signature (proof of possession) verifies; a tampered CSR is rejected.
 * verifyIssuedBy accepts a certificate against its real issuer and rejects an
 * impostor. (Also cross-verified by @peculiar + openssl before that dependency was
 * dropped.) Network-free (Node WebCrypto).
 */
import {webcrypto} from 'crypto';
import {X509Der, X509Name, X509Reader, X509Signer, X509SignAlgorithm} from 'flyingfish_core';

/**
 * Generate a key pair and its SPKI export for a signature algorithm.
 * @param algorithm - the signature algorithm
 */
const generate = async(
    algorithm: X509SignAlgorithm
): Promise<{keys: webcrypto.CryptoKeyPair; spki: Uint8Array;}> => {
    const keyGen: webcrypto.Algorithm | webcrypto.EcKeyGenParams = algorithm === 'p256'
        ? {name: 'ECDSA', namedCurve: 'P-256'}
        : {name: 'Ed25519'};

    const keys = await webcrypto.subtle.generateKey(keyGen, true, ['sign', 'verify']) as webcrypto.CryptoKeyPair;
    const spki = new Uint8Array(await webcrypto.subtle.exportKey('spki', keys.publicKey));

    return {keys: keys, spki: spki};
};

/**
 * Build a self-signed CA certificate (issuer == subject) with the own PKI library.
 * @param commonName - the CA common name
 * @param algorithm - the signature algorithm
 */
const buildRoot = async(
    commonName: string,
    algorithm: X509SignAlgorithm
): Promise<{keys: webcrypto.CryptoKeyPair; name: Uint8Array; certDer: Uint8Array;}> => {
    const {keys, spki} = await generate(algorithm);
    const name = X509Der.distinguishedName([{oid: '2.5.4.3', value: commonName}]);

    const tbs = X509Der.tbsCertificate({
        serialNumber: Uint8Array.of(0x01),
        signatureAlgorithm: X509Signer.signatureAlgorithm(algorithm),
        issuer: name,
        notBefore: new Date(Date.UTC(2024, 0, 1)),
        notAfter: new Date(Date.UTC(2039, 0, 1)),
        subject: name,
        subjectPublicKeyInfo: spki
    });

    return {keys: keys, name: name, certDer: await X509Signer.signCertificate(tbs, keys.privateKey, algorithm)};
};

describe('own PKI CSR + issuance (own-pki-lib slice 5)', () => {
    test('an Ed25519 CSR we build carries the subject and verifies (proof of possession)', async() => {
        const {keys, spki} = await generate('ed25519');
        const subject = X509Der.distinguishedName([{oid: '2.5.4.3', value: 'flyingfish-nginx-01'}]);

        const csrDer = await X509Signer.signCsr(subject, spki, keys.privateKey, 'ed25519');

        // the subject reads back and the self-signature (proof of possession) verifies
        expect(X509Name.format(X509Reader.csrSubjectAttributes(csrDer))).toContain('CN=flyingfish-nginx-01');
        expect(await X509Signer.verifyCsr(csrDer)).toBe(true);
    });

    test('an ECDSA P-256 CSR we build verifies (exercises P1363<->DER)', async() => {
        const {keys, spki} = await generate('p256');
        const subject = X509Der.distinguishedName([{oid: '2.5.4.3', value: 'flyingfish-dns-01'}]);

        const csrDer = await X509Signer.signCsr(subject, spki, keys.privateKey, 'p256');

        expect(await X509Signer.verifyCsr(csrDer)).toBe(true);
    });

    test('a tampered CSR signature is rejected', async() => {
        const {keys, spki} = await generate('ed25519');
        const subject = X509Der.distinguishedName([{oid: '2.5.4.3', value: 'flyingfish-nginx-01'}]);

        const csrDer = await X509Signer.signCsr(subject, spki, keys.privateKey, 'ed25519');

        const tampered = Uint8Array.from(csrDer);
        const last = tampered.length - 1;
        tampered[last] = (tampered[last] + 1) % 256;

        expect(await X509Signer.verifyCsr(tampered)).toBe(false);
    });

    test('verifyIssuedBy accepts the real issuer and rejects an impostor', async() => {
        const root = await buildRoot('FlyingFish Root CA', 'ed25519');
        const other = await buildRoot('Rogue CA', 'ed25519');
        const {spki} = await generate('ed25519');

        // an intermediate SIGNED BY the root's key, but carrying its own subject
        const interTbs = X509Der.tbsCertificate({
            serialNumber: Uint8Array.of(0x02),
            signatureAlgorithm: X509Signer.signatureAlgorithm('ed25519'),
            issuer: root.name,
            notBefore: new Date(Date.UTC(2024, 0, 1)),
            notAfter: new Date(Date.UTC(2039, 0, 1)),
            subject: X509Der.distinguishedName([{oid: '2.5.4.3', value: 'FlyingFish Service Intermediate CA'}]),
            subjectPublicKeyInfo: spki
        });

        const interCert = await X509Signer.signCertificate(interTbs, root.keys.privateKey, 'ed25519');

        expect(await X509Signer.verifyIssuedBy(interCert, root.certDer)).toBe(true);
        expect(await X509Signer.verifyIssuedBy(interCert, other.certDer)).toBe(false);
    });
});