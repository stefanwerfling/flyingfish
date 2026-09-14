/**
 * Unit tests for the own-PKI DER encoder (own-pki-lib slice 1). Each case checks
 * the encoded bytes against the known DER encoding (hex), so the ASN.1 layer the
 * X.509/CSR/CRL code will build on is verified against the standard. Network-free.
 */
import {Der} from 'flyingfish_core';

/**
 * Lower-case hex of an encoding.
 * @param bytes - the encoded bytes
 */
const hex = (bytes: Uint8Array): string => {
    return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

describe('DER encoder (own PKI lib, slice 1)', () => {
    test('INTEGER: minimal, with the positive-padding rule', () => {
        expect(hex(Der.integer(0))).toBe('020100');
        expect(hex(Der.integer(2))).toBe('020102');
        expect(hex(Der.integer(127))).toBe('02017f');
        // high bit set -> prepend 0x00 so it is not read as negative
        expect(hex(Der.integer(128))).toBe('02020080');
        expect(hex(Der.integer(256))).toBe('02020100');
    });

    test('integerFromBytes trims leading zeros and pads a high-bit value', () => {
        expect(hex(Der.integerFromBytes(Uint8Array.of(0x00, 0x00, 0x2a)))).toBe('02012a');
        expect(hex(Der.integerFromBytes(Uint8Array.of(0x80)))).toBe('02020080');
    });

    test('BOOLEAN / NULL', () => {
        expect(hex(Der.boolean(true))).toBe('0101ff');
        expect(hex(Der.boolean(false))).toBe('010100');
        expect(hex(Der.nullValue())).toBe('0500');
    });

    test('OBJECT IDENTIFIER', () => {
        // basicConstraints 2.5.29.19
        expect(hex(Der.objectIdentifier('2.5.29.19'))).toBe('0603551d13');
        // sha256WithRSAEncryption 1.2.840.113549.1.1.11 (multi-byte sub-ids)
        expect(hex(Der.objectIdentifier('1.2.840.113549.1.1.11'))).toBe('06092a864886f70d01010b');
    });

    test('OCTET STRING / BIT STRING / strings', () => {
        expect(hex(Der.octetString(Uint8Array.of(0x01, 0x02)))).toBe('04020102');
        expect(hex(Der.bitString(Uint8Array.of(0x01)))).toBe('03020001');
        expect(hex(Der.utf8String('A'))).toBe('0c0141');
        expect(hex(Der.printableString('CA'))).toBe('13024341');
        expect(hex(Der.ia5String('a'))).toBe('160161');
    });

    test('SEQUENCE composes its members', () => {
        expect(hex(Der.sequence([Der.integer(1), Der.boolean(true)]))).toBe('30060201010101ff');
    });

    test('context tags: EXPLICIT [0] and IMPLICIT [0]', () => {
        expect(hex(Der.explicit(0, Der.integer(2)))).toBe('a003020102');
        expect(hex(Der.implicit(0, Uint8Array.of(0x41)))).toBe('800141');
    });

    test('UTCTime encodes YYMMDDHHMMSSZ', () => {
        const date = new Date(Date.UTC(2023, 0, 2, 3, 4, 5));

        // "230102030405Z" = 13 bytes (len 0x0d)
        expect(hex(Der.utcTime(date))).toBe('170d3233303130323033303430355a');
    });

    test('long-form length prefixes content over 127 bytes', () => {
        const content = new Uint8Array(200).fill(0x41);
        const encoded = Der.octetString(content);

        // 0x04 tag, 0x81 (1 length byte follows), 0xc8 (=200), then the content
        expect(hex(encoded.subarray(0, 3))).toBe('0481c8');
        expect(encoded.length).toBe(3 + 200);
    });
});