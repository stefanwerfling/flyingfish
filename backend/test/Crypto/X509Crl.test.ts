/**
 * Unit tests for the own-PKI CRL (own-pki-lib slice 5) — the original motivation:
 * @peculiar/x509 v2.1.0 serialized revoked entries but read them back empty. Our
 * own encode + parse round-trips correctly: a CRL we sign lists its revoked
 * serials, matches them (normalized), verifies under the issuer key, and rejects
 * tampering. Network-free (Node WebCrypto).
 */
import {webcrypto} from 'crypto';
import {X509Crl, X509Der, X509Signer} from 'flyingfish_core';

/**
 * Build a signed CRL (our lib) revoking the given serials, plus the key pair.
 * @param serials - the revoked serial numbers (raw magnitude bytes)
 */
const buildCrl = async(serials: Uint8Array[]): Promise<{keys: webcrypto.CryptoKeyPair; crlDer: Uint8Array;}> => {
    const keys = await webcrypto.subtle.generateKey({name: 'Ed25519'}, true, ['sign', 'verify']) as webcrypto.CryptoKeyPair;
    const issuer = X509Der.distinguishedName([{oid: '2.5.4.3', value: 'FlyingFish Service Intermediate CA'}]);

    const tbs = X509Der.tbsCertList({
        signatureAlgorithm: X509Signer.signatureAlgorithm('ed25519'),
        issuer: issuer,
        thisUpdate: new Date(Date.UTC(2026, 0, 1)),
        nextUpdate: new Date(Date.UTC(2026, 0, 8)),
        entries: serials.map((serialNumber) => {
            return {serialNumber: serialNumber, revocationDate: new Date(Date.UTC(2026, 0, 1))};
        })
    });

    const crlDer = await X509Signer.signCrl(tbs, keys.privateKey, 'ed25519');

    return {keys: keys, crlDer: crlDer};
};

describe('own PKI CRL (own-pki-lib slice 5)', () => {
    test('lists + matches revoked serials (round-trips where @peculiar failed)', async() => {
        // 0x8a01 exercises the positive-padding rule; 0x02 is a short serial
        const {crlDer} = await buildCrl([Uint8Array.of(0x8a, 0x01), Uint8Array.of(0x02)]);

        const serials = X509Crl.listRevokedSerials(crlDer);
        expect(serials).toContain('8a01');
        expect(serials).toContain('2');

        // case-insensitive + leading-zero-insensitive matching
        expect(X509Crl.isSerialRevoked(crlDer, '8A01')).toBe(true);
        expect(X509Crl.isSerialRevoked(crlDer, '008a01')).toBe(true);
        expect(X509Crl.isSerialRevoked(crlDer, 'ff')).toBe(false);
    });

    test('an empty CRL lists nothing but is still a valid signed CRL', async() => {
        const {keys, crlDer} = await buildCrl([]);

        expect(X509Crl.listRevokedSerials(crlDer)).toEqual([]);
        expect(await X509Signer.verifyCrl(crlDer, keys.publicKey, 'ed25519')).toBe(true);
    });

    test('the CRL signature verifies under the issuer key and rejects tampering', async() => {
        const {keys, crlDer} = await buildCrl([Uint8Array.of(0x2a)]);

        expect(await X509Signer.verifyCrl(crlDer, keys.publicKey, 'ed25519')).toBe(true);

        const tampered = Uint8Array.from(crlDer);
        const last = tampered.length - 1;
        tampered[last] = (tampered[last] + 1) % 256;

        expect(await X509Signer.verifyCrl(tampered, keys.publicKey, 'ed25519')).toBe(false);
    });
});