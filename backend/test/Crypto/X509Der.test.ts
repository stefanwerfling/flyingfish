/**
 * Unit tests for the own-PKI X.509 structure encoders (own-pki-lib slice 3),
 * composed from Der + verified via DerReader. Checks the RFC 5280 shapes
 * (AlgorithmIdentifier, Name, Validity, Extension(s), TBSCertificate,
 * Certificate) against known DER and by round-trip, with a real WebCrypto SPKI
 * embedded in the TBS. Network-free (Node WebCrypto).
 */
import {webcrypto} from 'crypto';
import {Der, DerReader, X509Der} from 'flyingfish_core';

const CN_OID = '2.5.4.3';
const O_OID = '2.5.4.10';
const BASIC_CONSTRAINTS_OID = '2.5.29.19';

/**
 * Lower-case hex of an encoding.
 * @param bytes - the encoded bytes
 */
const hex = (bytes: Uint8Array): string => {
    return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

describe('X.509 DER structures (own PKI lib, slice 3)', () => {
    test('AlgorithmIdentifier for Ed25519 is SEQUENCE{OID} with no parameters', () => {
        // 30 05 06 03 2B 65 70 — the standard id-Ed25519 AlgorithmIdentifier
        expect(hex(X509Der.algorithmIdentifier('1.3.101.112'))).toBe('300506032b6570');

        const node = DerReader.parse(X509Der.algorithmIdentifier('1.3.101.112'));
        expect(node.children).toHaveLength(1);
        expect(DerReader.toOidString(node.children[0])).toBe('1.3.101.112');
    });

    test('distinguishedName encodes RDNs that decode back', () => {
        const name = X509Der.distinguishedName([
            {oid: CN_OID, value: 'FlyingFish Root CA'},
            {oid: O_OID, value: 'FlyingFish'}
        ]);

        const node = DerReader.parse(name);

        expect(node.tag).toBe(0x30);
        expect(node.children).toHaveLength(2);

        // each RDN is a SET (0x31) of one SEQUENCE{OID, value}
        const cnAtv = node.children[0].children[0];
        expect(node.children[0].tag).toBe(0x31);
        expect(DerReader.toOidString(cnAtv.children[0])).toBe(CN_OID);
        expect(DerReader.toText(cnAtv.children[1])).toBe('FlyingFish Root CA');

        const oAtv = node.children[1].children[0];
        expect(DerReader.toOidString(oAtv.children[0])).toBe(O_OID);
        expect(DerReader.toText(oAtv.children[1])).toBe('FlyingFish');
    });

    test('validity uses UTCTime before 2050 and GeneralizedTime after, round-tripping', () => {
        const notBefore = new Date(Date.UTC(2023, 0, 2, 3, 4, 5));
        const notAfter = new Date(Date.UTC(2099, 11, 31, 23, 59, 59));

        const node = DerReader.parse(X509Der.validity(notBefore, notAfter));

        expect(node.children[0].tag).toBe(0x17);
        expect(node.children[1].tag).toBe(0x18);
        expect(DerReader.toDate(node.children[0]).getTime()).toBe(notBefore.getTime());
        expect(DerReader.toDate(node.children[1]).getTime()).toBe(notAfter.getTime());
    });

    test('extension omits the critical flag when false, includes it when true', () => {
        const value = Der.sequence([Der.boolean(true)]);

        const critical = DerReader.parse(X509Der.extension(BASIC_CONSTRAINTS_OID, true, value));
        expect(critical.children).toHaveLength(3);
        expect(DerReader.toOidString(critical.children[0])).toBe(BASIC_CONSTRAINTS_OID);
        expect(DerReader.toBoolean(critical.children[1])).toBe(true);
        expect(critical.children[2].tag).toBe(0x04);

        const nonCritical = DerReader.parse(X509Der.extension(BASIC_CONSTRAINTS_OID, false, value));
        expect(nonCritical.children).toHaveLength(2);
        expect(nonCritical.children[1].tag).toBe(0x04);
    });

    test('tbsCertificate + certificate assemble the RFC 5280 structure', async() => {
        const keys = await webcrypto.subtle.generateKey({name: 'Ed25519'}, true, ['sign', 'verify']);
        const spki = new Uint8Array(await webcrypto.subtle.exportKey('spki', keys.publicKey));

        const sigAlg = X509Der.algorithmIdentifier('1.3.101.112');
        const name = X509Der.distinguishedName([{oid: CN_OID, value: 'FlyingFish Root CA'}]);
        const extensions = X509Der.extensions([
            X509Der.extension(BASIC_CONSTRAINTS_OID, true, Der.sequence([Der.boolean(true)]))
        ]);

        const tbs = X509Der.tbsCertificate({
            serialNumber: Uint8Array.of(0x01, 0x02),
            signatureAlgorithm: sigAlg,
            issuer: name,
            notBefore: new Date(Date.UTC(2024, 0, 1)),
            notAfter: new Date(Date.UTC(2039, 0, 1)),
            subject: name,
            subjectPublicKeyInfo: spki,
            extensions: extensions
        });

        const certificate = X509Der.certificate(tbs, sigAlg, Uint8Array.of(0xaa, 0xbb));
        const node = DerReader.parse(certificate);

        // Certificate ::= SEQUENCE { tbsCertificate, signatureAlgorithm, signature }
        expect(node.tag).toBe(0x30);
        expect(node.children).toHaveLength(3);
        expect(node.children[2].tag).toBe(0x03);

        const tbsNode = node.children[0];
        // version [0] EXPLICIT (0xa0), serial INTEGER, sigAlg, issuer, validity,
        // subject, spki, extensions [3] EXPLICIT (0xa3)
        expect(tbsNode.children[0].tag).toBe(0xa0);
        expect(DerReader.toInteger(tbsNode.children[0].children[0])).toBe(2n);
        expect(DerReader.toInteger(tbsNode.children[1])).toBe(0x0102n);
        expect(tbsNode.children[7].tag).toBe(0xa3);
    });
});