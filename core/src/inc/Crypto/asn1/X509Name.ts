import {DerReader} from './DerReader.js';
import {X509RdnAttribute} from './X509Der.js';

const PRINTABLE_STRING_TAG = 0x13;
const OID_PATTERN = /^\d+(\.\d+)+$/u;

const OID_BY_NAME: Record<string, string> = {
    CN: '2.5.4.3',
    C: '2.5.4.6',
    L: '2.5.4.7',
    ST: '2.5.4.8',
    O: '2.5.4.10',
    OU: '2.5.4.11',
    STREET: '2.5.4.9',
    DC: '0.9.2342.19200300.100.1.25',
    UID: '0.9.2342.19200300.100.1.1',
    E: '1.2.840.113549.1.9.1',
    EMAILADDRESS: '1.2.840.113549.1.9.1'
};

const NAME_BY_OID: Record<string, string> = {
    '2.5.4.3': 'CN',
    '2.5.4.6': 'C',
    '2.5.4.7': 'L',
    '2.5.4.8': 'ST',
    '2.5.4.10': 'O',
    '2.5.4.11': 'OU',
    '2.5.4.9': 'STREET',
    '0.9.2342.19200300.100.1.25': 'DC',
    '0.9.2342.19200300.100.1.1': 'UID',
    '1.2.840.113549.1.9.1': 'E'
};

/**
 * Distinguished-name conversion for the FlyingFish own PKI library (own-pki-lib
 * slice 7c): parse an RFC 4514 DN string (`CN=..., O=...`) into the structured
 * attributes {@link X509Der.distinguishedName} encodes, format attributes back to
 * a string, and read a Name back out of its DER. This is the bridge between the
 * builder's string subjects and the own-lib structured encoder, replacing
 * @peculiar's Name handling.
 */
export class X509Name {

    /**
     * Parse an RFC 4514 DN string into attributes (one per RDN, in order).
     * Attribute types may be short names (CN, O, ...) or dotted OIDs; values may
     * use backslash escaping.
     * @param dn - the DN string, e.g. 'CN=FlyingFish Root CA, O=FlyingFish'
     */
    public static parse(dn: string): X509RdnAttribute[] {
        const attributes: X509RdnAttribute[] = [];

        for (const rdn of X509Name._splitUnescaped(dn, ',')) {
            if (rdn.trim().length === 0) {
                continue;
            }

            const equals = X509Name._indexOfUnescaped(rdn, '=');

            if (equals === -1) {
                throw new Error(`X509Name: invalid RDN "${rdn}"`);
            }

            attributes.push({
                oid: X509Name._oidForType(rdn.slice(0, equals).trim()),
                value: X509Name._unescape(rdn.slice(equals + 1).trim())
            });
        }

        return attributes;
    }

    /**
     * Format attributes back to an RFC 4514 DN string (', '-separated).
     * @param attributes - the RDN attributes
     */
    public static format(attributes: X509RdnAttribute[]): string {
        return attributes
        .map((attribute) => `${NAME_BY_OID[attribute.oid] ?? attribute.oid}=${X509Name._escape(attribute.value)}`)
        .join(', ');
    }

    /**
     * Read a Name (SEQUENCE OF SET OF AttributeTypeAndValue) back out of its DER
     * into attributes.
     * @param nameDer - the encoded Name
     */
    public static fromDer(nameDer: Uint8Array): X509RdnAttribute[] {
        const attributes: X509RdnAttribute[] = [];

        for (const rdn of DerReader.parse(nameDer).children) {
            for (const atv of rdn.children) {
                attributes.push({
                    oid: DerReader.toOidString(atv.children[0]),
                    value: DerReader.toText(atv.children[1]),
                    printable: atv.children[1].tag === PRINTABLE_STRING_TAG
                });
            }
        }

        return attributes;
    }

    /**
     * The values of a given attribute type (OID) in a set of attributes.
     * @param attributes - the RDN attributes
     * @param oid - the attribute type OID
     */
    public static getField(attributes: X509RdnAttribute[], oid: string): string[] {
        return attributes.filter((attribute) => attribute.oid === oid).map((attribute) => attribute.value);
    }

    /**
     * The OID for an attribute type: a short name (case-insensitive) or a dotted
     * OID passed straight through.
     * @param type - the attribute type token
     */
    private static _oidForType(type: string): string {
        if (OID_PATTERN.test(type)) {
            return type;
        }

        const oid = OID_BY_NAME[type.toUpperCase()];

        if (oid === undefined) {
            throw new Error(`X509Name: unknown attribute type "${type}"`);
        }

        return oid;
    }

    /**
     * Split a string on an unescaped separator (a backslash escapes the next
     * character).
     * @param value - the string
     * @param separator - the separator character
     */
    private static _splitUnescaped(value: string, separator: string): string[] {
        const parts: string[] = [];
        let current = '';
        let escaped = false;

        for (const char of value) {
            if (escaped) {
                current += `\\${char}`;
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === separator) {
                parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        parts.push(current);

        return parts;
    }

    /**
     * The index of the first unescaped occurrence of a character, or -1.
     * @param value - the string
     * @param char - the character to find
     */
    private static _indexOfUnescaped(value: string, char: string): number {
        let escaped = false;

        for (let index = 0; index < value.length; index += 1) {
            if (escaped) {
                escaped = false;
            } else if (value[index] === '\\') {
                escaped = true;
            } else if (value[index] === char) {
                return index;
            }
        }

        return -1;
    }

    /**
     * Remove RFC 4514 backslash escaping from a value.
     * @param value - the escaped value
     */
    private static _unescape(value: string): string {
        return value.replace(/\\(.)/gu, '$1');
    }

    /**
     * Apply RFC 4514 backslash escaping to a value's special characters.
     * @param value - the raw value
     */
    private static _escape(value: string): string {
        return value.replace(/([,+"\\<>;=])/gu, '\\$1');
    }

}