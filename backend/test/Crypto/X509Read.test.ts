/**
 * Unit tests for the own-PKI reading layer (own-pki-lib slice 7c): X509Name (RFC
 * 4514 DN string <-> attributes, and reading a Name out of DER) and X509Reader
 * (validity, subject attributes, SPKI, BasicConstraints, SubjectAltName off a
 * certificate / CSR). Read back against certificates the own library builds — the
 * values read out equal the values that went in. These are the reads the PKI
 * consumers need so they can drop @peculiar. Network-free.
 */
import {webcrypto} from 'crypto';
import {X509Der, X509Ext, X509Name, X509Reader, X509Signer} from 'flyingfish_core';

const NOT_BEFORE = new Date(Date.UTC(2026, 0, 1));
const NOT_AFTER = new Date(Date.UTC(2039, 0, 1));

/**
 * Generate an Ed25519 key pair + its SPKI.
 */
const generate = async(): Promise<{keys: webcrypto.CryptoKeyPair; spki: Uint8Array;}> => {
    const keys = await webcrypto.subtle.generateKey({name: 'Ed25519'}, true, ['sign', 'verify']) as webcrypto.CryptoKeyPair;
    const spki = new Uint8Array(await webcrypto.subtle.exportKey('spki', keys.publicKey));

    return {keys: keys, spki: spki};
};

describe('own PKI reading layer (own-pki-lib slice 7c)', () => {
    test('X509Name round-trips a DN string through attributes and DER', () => {
        const attributes = X509Name.parse('CN=FlyingFish Root CA, O=FlyingFish');

        expect(attributes).toEqual([
            {oid: '2.5.4.3', value: 'FlyingFish Root CA'},
            {oid: '2.5.4.10', value: 'FlyingFish'}
        ]);

        // the encoded Name round-trips back to the same attributes
        const nameDer = X509Der.distinguishedName(attributes);
        expect(X509Name.getField(X509Name.fromDer(nameDer), '2.5.4.10')).toEqual(['FlyingFish']);
        expect(X509Name.format(X509Name.fromDer(nameDer))).toContain('CN=FlyingFish Root CA');
    });

    test('X509Reader reads validity, subject O, SPKI and BasicConstraints', async() => {
        const {keys, spki} = await generate();
        const name = X509Der.distinguishedName(X509Name.parse('CN=Root, O=FlyingFish'));

        const tbs = X509Der.tbsCertificate({
            serialNumber: Uint8Array.of(0x2a),
            signatureAlgorithm: X509Signer.signatureAlgorithm('ed25519'),
            issuer: name,
            notBefore: NOT_BEFORE,
            notAfter: NOT_AFTER,
            subject: name,
            subjectPublicKeyInfo: spki,
            extensions: X509Der.extensions([X509Ext.basicConstraints(true, 2, true)])
        });

        const certDer = await X509Signer.signCertificate(tbs, keys.privateKey, 'ed25519');

        const validity = X509Reader.validity(certDer);
        expect(validity.notBefore.getTime()).toBe(NOT_BEFORE.getTime());
        expect(validity.notAfter.getTime()).toBe(NOT_AFTER.getTime());

        expect(X509Name.getField(X509Reader.subjectAttributes(certDer), '2.5.4.10')).toEqual(['FlyingFish']);
        expect(Buffer.from(X509Reader.subjectPublicKeyInfo(certDer)).equals(Buffer.from(spki))).toBe(true);

        expect(X509Reader.basicConstraints(certDer)).toEqual({ca: true, pathLength: 2});
    });

    test('X509Reader reads SAN entries incl. the identity URI, and a leaf BC', async() => {
        const {keys, spki} = await generate();
        const name = X509Der.distinguishedName(X509Name.parse('CN=nginx, O=FlyingFish'));

        const tbs = X509Der.tbsCertificate({
            serialNumber: Uint8Array.of(0x2b),
            signatureAlgorithm: X509Signer.signatureAlgorithm('ed25519'),
            issuer: name,
            notBefore: NOT_BEFORE,
            notAfter: NOT_AFTER,
            subject: name,
            subjectPublicKeyInfo: spki,
            extensions: X509Der.extensions([
                X509Ext.basicConstraints(false, undefined, true),
                X509Ext.subjectAltName([
                    {type: 'url', value: 'flyingfish://node/uuid-1'},
                    {type: 'ip', value: '10.103.0.9'},
                    {type: 'ip', value: 'fd00::9'}
                ])
            ])
        });

        const certDer = await X509Signer.signCertificate(tbs, keys.privateKey, 'ed25519');

        const san = X509Reader.subjectAltNames(certDer);
        const urls = san.filter((entry) => entry.type === 'url').map((entry) => entry.value);
        expect(urls).toEqual(['flyingfish://node/uuid-1']);
        expect(san.filter((entry) => entry.type === 'ip')).toHaveLength(2);

        expect(X509Reader.basicConstraints(certDer)).toEqual({ca: false, pathLength: null});
    });

    test('X509Reader reads a CSR subject + public key (importable, verifies)', async() => {
        const {keys, spki} = await generate();
        const subject = X509Der.distinguishedName(X509Name.parse('CN=svc-a'));
        const csrDer = await X509Signer.signCsr(subject, spki, keys.privateKey, 'ed25519');

        expect(X509Name.format(X509Reader.csrSubjectAttributes(csrDer))).toContain('CN=svc-a');

        // the SPKI we read back imports to a usable public key and the CSR verifies
        const publicKey = await webcrypto.subtle.importKey(
            'spki', X509Reader.csrSubjectPublicKeyInfo(csrDer), {name: 'Ed25519'}, true, ['verify']
        );
        expect(publicKey.type).toBe('public');
        expect(await X509Signer.verifyCsr(csrDer)).toBe(true);
    });
});