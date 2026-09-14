/**
 * Unit tests for the own-PKI PEM codec (own-pki-lib slice 6). A DER our library
 * produces round-trips through PEM byte-for-byte; decode tolerates foreign
 * formatting (CRLF, unwrapped lines); decodeAll reads a multi-block bundle and the
 * label filter selects the right block. Network-free (Node WebCrypto).
 */
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

    test('decode tolerates foreign PEM formatting (CRLF, a single unwrapped line)', async() => {
        const der = await buildCert('FlyingFish Service Intermediate CA');
        const base64 = Buffer.from(der).toString('base64');

        // one unwrapped base64 line with CRLF endings, as other tools emit
        const foreign = `-----BEGIN CERTIFICATE-----\r\n${base64}\r\n-----END CERTIFICATE-----\r\n`;

        expect(Buffer.from(Pem.decode(foreign)).equals(Buffer.from(der))).toBe(true);
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