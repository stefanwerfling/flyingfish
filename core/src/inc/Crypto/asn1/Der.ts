/* eslint-disable no-bitwise -- DER is a byte/bit encoding; bitwise ops are intrinsic. */

/**
 * Minimal DER (Distinguished Encoding Rules) encoder for the FlyingFish own PKI
 * library (own-pki-lib slice 1 — the foundation the X.509 / CSR / CRL layers are
 * built on, replacing @peculiar/x509 + @peculiar/asn1-*). Each method returns the
 * complete TLV (tag-length-value) byte string for one ASN.1 value; constructed
 * types (sequence/set/explicit) compose child encodings. DER only: definite
 * lengths, minimal integer/length encodings.
 */
export class Der {

    /**
     * Concatenate byte arrays.
     * @param parts - the byte arrays
     */
    public static concat(parts: Uint8Array[]): Uint8Array {
        const total = parts.reduce((sum, part) => sum + part.length, 0);
        const out = new Uint8Array(total);
        let offset = 0;

        for (const part of parts) {
            out.set(part, offset);
            offset += part.length;
        }

        return out;
    }

    /**
     * A SEQUENCE (tag 0x30) of the given already-encoded members.
     * @param items - the encoded members
     */
    public static sequence(items: Uint8Array[]): Uint8Array {
        return Der._tlv(0x30, Der.concat(items));
    }

    /**
     * A SET (tag 0x31) of the given already-encoded members.
     * @param items - the encoded members
     */
    public static set(items: Uint8Array[]): Uint8Array {
        return Der._tlv(0x31, Der.concat(items));
    }

    /**
     * An INTEGER (tag 0x02) from a non-negative JS number.
     * @param value - the non-negative integer
     */
    public static integer(value: number): Uint8Array {
        if (value < 0 || !Number.isSafeInteger(value)) {
            throw new Error('Der.integer: only non-negative safe integers are supported');
        }

        const bytes: number[] = [];
        let remaining = value;

        do {
            bytes.unshift(remaining & 0xff);
            remaining = Math.floor(remaining / 256);
        } while (remaining > 0);

        return Der.integerFromBytes(Uint8Array.from(bytes));
    }

    /**
     * An INTEGER (tag 0x02) from raw big-endian magnitude bytes, treated as a
     * non-negative value (a leading 0x00 is prepended when the high bit is set,
     * so it never reads as negative). Leading zero bytes are trimmed first. Used
     * for large values like certificate serial numbers.
     * @param magnitude - big-endian magnitude bytes
     */
    public static integerFromBytes(magnitude: Uint8Array): Uint8Array {
        let start = 0;

        while (start < magnitude.length - 1 && magnitude[start] === 0x00) {
            start += 1;
        }

        let value = magnitude.subarray(start);

        if (value.length === 0) {
            value = Uint8Array.of(0x00);
        }

        if ((value[0] & 0x80) !== 0) {
            value = Der.concat([Uint8Array.of(0x00), value]);
        }

        return Der._tlv(0x02, value);
    }

    /**
     * A BOOLEAN (tag 0x01): DER encodes true as 0xFF.
     * @param value - the boolean
     */
    public static boolean(value: boolean): Uint8Array {
        return Der._tlv(0x01, Uint8Array.of(value ? 0xff : 0x00));
    }

    /**
     * A NULL (tag 0x05).
     */
    public static nullValue(): Uint8Array {
        return Der._tlv(0x05, new Uint8Array(0));
    }

    /**
     * An OBJECT IDENTIFIER (tag 0x06) from a dotted string, e.g. '2.5.29.19'.
     * @param oid - the dotted OID
     */
    public static objectIdentifier(oid: string): Uint8Array {
        const parts = oid.split('.').map((part) => Number(part));

        if (parts.length < 2) {
            throw new Error(`Der.objectIdentifier: invalid OID "${oid}"`);
        }

        const bytes: number[] = [(40 * parts[0]) + parts[1]];

        for (const part of parts.slice(2)) {
            bytes.push(...Der._base128(part));
        }

        return Der._tlv(0x06, Uint8Array.from(bytes));
    }

    /**
     * An OCTET STRING (tag 0x04) wrapping the given content.
     * @param content - the raw content bytes
     */
    public static octetString(content: Uint8Array): Uint8Array {
        return Der._tlv(0x04, content);
    }

    /**
     * A BIT STRING (tag 0x03) with the given number of unused trailing bits.
     * @param content - the bit-string content bytes
     * @param unusedBits - number of unused trailing bits (0..7), default 0
     */
    public static bitString(content: Uint8Array, unusedBits: number = 0): Uint8Array {
        return Der._tlv(0x03, Der.concat([Uint8Array.of(unusedBits), content]));
    }

    /**
     * A UTF8String (tag 0x0C).
     * @param value - the string
     */
    public static utf8String(value: string): Uint8Array {
        return Der._tlv(0x0c, new TextEncoder().encode(value));
    }

    /**
     * A PrintableString (tag 0x13).
     * @param value - the string (printable subset)
     */
    public static printableString(value: string): Uint8Array {
        return Der._tlv(0x13, new TextEncoder().encode(value));
    }

    /**
     * An IA5String (tag 0x16), for ASCII values such as DNS names / URIs.
     * @param value - the string
     */
    public static ia5String(value: string): Uint8Array {
        return Der._tlv(0x16, new TextEncoder().encode(value));
    }

    /**
     * A UTCTime (tag 0x17), 'YYMMDDHHMMSSZ' — valid for years 1950..2049.
     * @param date - the date
     */
    public static utcTime(date: Date): Uint8Array {
        const yy = Der._pad2(date.getUTCFullYear() % 100);
        const value = `${yy}${Der._dateBody(date)}Z`;

        return Der._tlv(0x17, new TextEncoder().encode(value));
    }

    /**
     * A GeneralizedTime (tag 0x18), 'YYYYMMDDHHMMSSZ' — for years outside
     * 1950..2049.
     * @param date - the date
     */
    public static generalizedTime(date: Date): Uint8Array {
        const value = `${date.getUTCFullYear()}${Der._dateBody(date)}Z`;

        return Der._tlv(0x18, new TextEncoder().encode(value));
    }

    /**
     * A context-specific EXPLICIT tag [n] (constructed) wrapping the content.
     * @param tagNumber - the context tag number (0..30)
     * @param content - the already-encoded inner value
     */
    public static explicit(tagNumber: number, content: Uint8Array): Uint8Array {
        return Der._tlv(0xa0 + tagNumber, content);
    }

    /**
     * A context-specific IMPLICIT primitive tag [n], for the raw content bytes.
     * @param tagNumber - the context tag number (0..30)
     * @param content - the raw content bytes
     */
    public static implicit(tagNumber: number, content: Uint8Array): Uint8Array {
        return Der._tlv(0x80 + tagNumber, content);
    }

    /**
     * Assemble one TLV: tag byte + DER length + content.
     * @param tag - the (already-composed) tag byte
     * @param content - the value bytes
     */
    private static _tlv(tag: number, content: Uint8Array): Uint8Array {
        return Der.concat([Uint8Array.of(tag), Der._length(content.length), content]);
    }

    /**
     * DER definite length encoding.
     * @param length - the content length
     */
    private static _length(length: number): Uint8Array {
        if (length < 0x80) {
            return Uint8Array.of(length);
        }

        const bytes: number[] = [];
        let remaining = length;

        while (remaining > 0) {
            bytes.unshift(remaining & 0xff);
            remaining = Math.floor(remaining / 256);
        }

        return Uint8Array.from([0x80 | bytes.length, ...bytes]);
    }

    /**
     * base-128 (7-bit) encoding of one OID sub-identifier (high bit set on all
     * but the last byte).
     * @param value - the sub-identifier
     */
    private static _base128(value: number): number[] {
        const bytes: number[] = [value & 0x7f];
        let remaining = Math.floor(value / 128);

        while (remaining > 0) {
            bytes.unshift((remaining & 0x7f) | 0x80);
            remaining = Math.floor(remaining / 128);
        }

        return bytes;
    }

    /**
     * The 'MMDDHHMMSS' body shared by the two time formats.
     * @param date - the date
     */
    private static _dateBody(date: Date): string {
        return `${Der._pad2(date.getUTCMonth() + 1)}${Der._pad2(date.getUTCDate())}` +
            `${Der._pad2(date.getUTCHours())}${Der._pad2(date.getUTCMinutes())}${Der._pad2(date.getUTCSeconds())}`;
    }

    /**
     * Zero-pad a number to two digits.
     * @param value - the number (0..99)
     */
    private static _pad2(value: number): string {
        return value.toString().padStart(2, '0');
    }

}