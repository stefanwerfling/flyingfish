/**
 * Unit tests for the own-PKI X.509 extension encoders (own-pki-lib slice 7).
 * Dependency-free: each deterministic extension is asserted against a frozen
 * golden DER vector (these exact bytes were proven byte-for-byte equal to
 * @peculiar/x509 in commit 1a7110d, before that dependency was dropped), and the
 * key-dependent SubjectKeyIdentifier / AuthorityKeyIdentifier are checked against
 * an independent SHA-1 computed with Node's crypto (RFC 5280 method 1). Round-trip
 * reads live in X509Read.test.ts. Network-free (Node WebCrypto).
 */
import {createHash, webcrypto} from 'crypto';
import {X509Ext} from 'flyingfish_core';

/**
 * The lower-case hex of a byte array.
 * @param bytes - the bytes
 */
const hex = (bytes: Uint8Array): string => Buffer.from(bytes).toString('hex');

describe('own PKI extension encoders (own-pki-lib slice 7)', () => {
    test('BasicConstraints matches its golden DER (CA with pathLen, and a leaf)', () => {
        expect(hex(X509Ext.basicConstraints(true, 1, true))).toBe('30120603551d130101ff040830060101ff020101');
        expect(hex(X509Ext.basicConstraints(false, undefined, true))).toBe('300c0603551d130101ff04023000');
    });

    test('KeyUsage matches its golden DER (keyCertSign+cRLSign, and digitalSignature)', () => {
        expect(hex(X509Ext.keyUsage([X509Ext.KU_KEY_CERT_SIGN, X509Ext.KU_CRL_SIGN], true)))
        .toBe('300e0603551d0f0101ff040403020106');
        expect(hex(X509Ext.keyUsage([X509Ext.KU_DIGITAL_SIGNATURE], true)))
        .toBe('300e0603551d0f0101ff040403020780');
    });

    test('ExtendedKeyUsage (clientAuth + serverAuth) matches its golden DER', () => {
        expect(hex(X509Ext.extendedKeyUsage([X509Ext.EKU_CLIENT_AUTH, X509Ext.EKU_SERVER_AUTH], false)))
        .toBe('301d0603551d250416301406082b0601050507030206082b06010505070301');
    });

    test('SubjectAltName (dns, ip4, ip6, url) matches its golden DER', () => {
        const entries = [
            {type: 'dns' as const, value: 'nginx-01.service.flyingfish.internal'},
            {type: 'ip' as const, value: '10.20.30.40'},
            {type: 'ip' as const, value: '2001:db8::1'},
            {type: 'url' as const, value: 'flyingfish://node/2f1c'}
        ];

        expect(hex(X509Ext.subjectAltName(entries))).toBe(
            '305f0603551d110458305682246e67696e782d30312e736572766963652e666c79696e67666973682e696e7465726e616c' +
            '87040a141e28871020010db80000000000000000000000018616666c79696e67666973683a2f2f6e6f64652f32663163'
        );
    });

    test('NameConstraints (permitted dns + uri subtrees) matches its golden DER', () => {
        expect(hex(X509Ext.nameConstraints(['.service.flyingfish.internal'], ['flyingfish://service/'], true))).toBe(
            '30470603551d1e0101ff043d303ba039301e821c2e736572766963652e666c79696e67666973682e696e7465726e616c' +
            '30178615666c79696e67666973683a2f2f736572766963652f'
        );
    });

    test('the key identifier is the SHA-1 of the raw public key (RFC 5280 method 1)', async() => {
        const keys = await webcrypto.subtle.generateKey({name: 'Ed25519'}, true, ['sign', 'verify']) as webcrypto.CryptoKeyPair;
        const rawPublicKey = new Uint8Array(await webcrypto.subtle.exportKey('raw', keys.publicKey));

        // independent oracle: Node's own SHA-1 over the raw key bytes
        const expected = new Uint8Array(createHash('sha1').update(rawPublicKey).digest());
        const keyId = await X509Ext.keyIdentifier(keys.publicKey);

        expect(hex(keyId)).toBe(hex(expected));

        // and the SKI / AKI extensions wrap that identifier in the RFC 5280 shape
        expect(hex(X509Ext.subjectKeyIdentifier(keyId))).toBe(`301d0603551d0e04160414${hex(keyId)}`);
        expect(hex(X509Ext.authorityKeyIdentifier(keyId))).toBe(`301f0603551d23041830168014${hex(keyId)}`);
    });
});