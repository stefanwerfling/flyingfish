/**
 * Unit tests for the own-PKI DER decoder (own-pki-lib slice 2). Round-trips the
 * encoder (Der -> DerReader), checks the DerNode tree structure and strictness,
 * and — importantly — parses a REAL WebCrypto SPKI export so the parser is
 * validated against real-world DER, not only our own encoder's output.
 * Network-free (Node WebCrypto).
 */
import {webcrypto} from 'crypto';
import {Der, DerReader} from 'flyingfish_core';

describe('DER decoder (own PKI lib, slice 2)', () => {
    test('round-trips INTEGER / BOOLEAN / OID / BIT STRING / string / time', () => {
        expect(DerReader.toInteger(DerReader.parse(Der.integer(0)))).toBe(0n);
        expect(DerReader.toInteger(DerReader.parse(Der.integer(128)))).toBe(128n);
        expect(DerReader.toInteger(DerReader.parse(Der.integer(300)))).toBe(300n);

        expect(DerReader.toBoolean(DerReader.parse(Der.boolean(true)))).toBe(true);
        expect(DerReader.toBoolean(DerReader.parse(Der.boolean(false)))).toBe(false);

        expect(DerReader.toOidString(DerReader.parse(Der.objectIdentifier('2.5.29.19')))).toBe('2.5.29.19');
        expect(DerReader.toOidString(DerReader.parse(Der.objectIdentifier('1.2.840.113549.1.1.11')))).toBe('1.2.840.113549.1.1.11');

        const bits = DerReader.toBitString(DerReader.parse(Der.bitString(Uint8Array.of(0xab, 0xcd), 0)));
        expect(bits.unusedBits).toBe(0);
        expect(Array.from(bits.bytes)).toEqual([0xab, 0xcd]);

        expect(DerReader.toText(DerReader.parse(Der.utf8String('FlyingFish CA')))).toBe('FlyingFish CA');

        const date = new Date(Date.UTC(2023, 0, 2, 3, 4, 5));
        expect(DerReader.toDate(DerReader.parse(Der.utcTime(date))).getTime()).toBe(date.getTime());

        const future = new Date(Date.UTC(2099, 11, 31, 23, 59, 59));
        expect(DerReader.toDate(DerReader.parse(Der.generalizedTime(future))).getTime()).toBe(future.getTime());
    });

    test('parses the constructed SEQUENCE tree', () => {
        const encoded = Der.sequence([Der.integer(1), Der.utf8String('CA'), Der.boolean(true)]);
        const node = DerReader.parse(encoded);

        expect(node.tag).toBe(0x30);
        expect(node.constructed).toBe(true);
        expect(node.children).toHaveLength(3);
        expect(DerReader.toInteger(node.children[0])).toBe(1n);
        expect(DerReader.toText(node.children[1])).toBe('CA');
        expect(DerReader.toBoolean(node.children[2])).toBe(true);
    });

    test('is strict: rejects trailing bytes and indefinite length', () => {
        const withTrailing = Der.concat([Der.integer(1), Uint8Array.of(0x00)]);
        expect(() => DerReader.parse(withTrailing)).toThrow();

        // 0x30 (SEQUENCE), 0x80 (indefinite length) — not valid DER
        expect(() => DerReader.parse(Uint8Array.of(0x30, 0x80))).toThrow();

        // content length runs past the buffer
        expect(() => DerReader.parse(Uint8Array.of(0x04, 0x05, 0x01))).toThrow();
    });

    test('parses a real WebCrypto Ed25519 SPKI export', async() => {
        const keys = await webcrypto.subtle.generateKey({name: 'Ed25519'}, true, ['sign', 'verify']);
        const spki = new Uint8Array(await webcrypto.subtle.exportKey('spki', keys.publicKey));

        const node = DerReader.parse(spki);

        // SubjectPublicKeyInfo ::= SEQUENCE { algorithm AlgorithmIdentifier, subjectPublicKey BIT STRING }
        expect(node.tag).toBe(0x30);
        expect(node.children).toHaveLength(2);

        const algorithmId = node.children[0];
        expect(algorithmId.tag).toBe(0x30);
        // the algorithm OID is id-Ed25519 = 1.3.101.112
        expect(DerReader.toOidString(algorithmId.children[0])).toBe('1.3.101.112');

        // the public key is a BIT STRING (tag 0x03), 32 bytes for Ed25519
        expect(node.children[1].tag).toBe(0x03);
        expect(DerReader.toBitString(node.children[1]).bytes).toHaveLength(32);
    });
});