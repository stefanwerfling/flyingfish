/**
 * Unit tests for the own-PKI PEM codec (own-pki-lib slice 6). A DER our library
 * produces round-trips through PEM byte-for-byte; the PEM we emit is parsed by the
 * reference we intend to drop (@peculiar/x509) and, conversely, we decode the PEM
 * @peculiar emits. decodeAll reads a multi-block bundle and the label filter
 * selects the right block. Network-free (Node WebCrypto).
 */
import * as x509 from '@peculiar/x509';
import {webcrypto} from 'crypto';
import {Pem, X509Der, X509Signer} from 'flyingfish_core';

/**
 * Build a self-signed Ed25519 certificate DER with the own PKI library.
 * @param commonName - the certificate common name
 */
const buildCert = async(commonName: string): Promise<Uint8Array> => {
    const keys = await webcrypto.subtle.generateKey({name: 'Ed25519'}, true, ['sign', 'verify']) as webcrypto.CryptoKeyPair;
    const spki = new Uint8Array(await webcrypto.subtle.exportKey('spki', keys.publicKey));
    const name = X509Der.distinguishedName([{oid: '2.5.4.3', value: commonName}]);

    const tbs = X509Der.tbsCertificate({
        serialNumber: Uint8Array.of(0x2a),
        signatureAlgorithm: X509Signer.signatureAlgorithm('ed25519'),
        issuer: name,
        notBefore: new Date(Date.UTC(2024, 0, 1)),
        notAfter: new Date(Date.UTC(2039, 0, 1)),
        subject: name,
        subjectPublicKeyInfo: spki
    });

    return X509Signer.signCertificate(tbs, keys.privateKey, 'ed25519');
};

describe('own PKI PEM codec (own-pki-lib slice 6)', () => {
    test('a certificate round-trips DER -> PEM -> DER byte-for-byte', async() => {
        const der = await buildCert('FlyingFish Root CA');
        const pem = Pem.encode(Pem.CERTIFICATE, der);

        expect(pem.startsWith('-----BEGIN CERTIFICATE-----\n')).toBe(true);
        expect(pem.endsWith('-----END CERTIFICATE-----\n')).toBe(true);
        // base64 body is wrapped at 64 columns
        expect(pem.split('\n').slice(1, -2).every((line) => line.length <= 64)).toBe(true);

        expect(Buffer.from(Pem.decode(pem)).equals(Buffer.from(der))).toBe(true);
    });

    test('the PEM we emit is parsed by @peculiar, and we decode @peculiar\'s PEM', async() => {
        const der = await buildCert('FlyingFish Service Intermediate CA');

        // @peculiar parses the PEM our codec emits, back to the same DER
        const reference = new x509.X509Certificate(Pem.encode(Pem.CERTIFICATE, der));
        expect(Buffer.from(new Uint8Array(reference.rawData)).equals(Buffer.from(der))).toBe(true);

        // conversely we decode the PEM @peculiar emits, back to the same DER
        expect(Buffer.from(Pem.decode(reference.toString('pem'))).equals(Buffer.from(der))).toBe(true);
    });

    test('decodeAll reads every block in a bundle and the label filter selects one', async() => {
        const first = await buildCert('leaf-01');
        const second = await buildCert('intermediate-01');
        const bundle = Pem.encode(Pem.CERTIFICATE, first) + Pem.encode(Pem.CERTIFICATE, second);

        const blocks = Pem.decodeAll(bundle);
        expect(blocks).toHaveLength(2);
        expect(Buffer.from(blocks[0].der).equals(Buffer.from(first))).toBe(true);
        expect(Buffer.from(blocks[1].der).equals(Buffer.from(second))).toBe(true);

        // a mixed bundle: the label filter picks only the request
        const keys = await webcrypto.subtle.generateKey({name: 'Ed25519'}, true, ['sign', 'verify']) as webcrypto.CryptoKeyPair;
        const spki = new Uint8Array(await webcrypto.subtle.exportKey('spki', keys.publicKey));
        const subject = X509Der.distinguishedName([{oid: '2.5.4.3', value: 'enroll-01'}]);
        const csr = await X509Signer.signCsr(subject, spki, keys.privateKey, 'ed25519');

        const mixed = Pem.encode(Pem.CERTIFICATE, first) + Pem.encode(Pem.CERTIFICATE_REQUEST, csr);
        const requests = Pem.decodeAll(mixed, Pem.CERTIFICATE_REQUEST);
        expect(requests).toHaveLength(1);
        expect(Buffer.from(requests[0].der).equals(Buffer.from(csr))).toBe(true);
    });

    test('decode throws when no matching block is present', async() => {
        const pem = Pem.encode(Pem.CERTIFICATE, await buildCert('leaf-01'));

        expect(() => Pem.decode(pem, Pem.CRL)).toThrow(/no PEM block/u);
    });
});