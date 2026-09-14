/* eslint-disable no-bitwise -- KeyUsage bit flags and IP octet splitting are bit operations by nature. */
import {webcrypto} from 'crypto';
import {Der} from './Der.js';
import {DerReader} from './DerReader.js';
import {X509Der} from './X509Der.js';

/**
 * The GeneralName kinds a subjectAltName / nameConstraints entry can take in the
 * FlyingFish PKI: a DNS host name, an IPv4/IPv6 literal, a URI (the stable logical
 * identity flyingfish://node/<uuid>), or an rfc822 email address.
 */
export type X509GeneralNameType = 'dns' | 'ip' | 'url' | 'email';

/**
 * One subject-alternative-name entry.
 */
export type X509GeneralName = {
    type: X509GeneralNameType;
    value: string;
};

const OID_BASIC_CONSTRAINTS = '2.5.29.19';
const OID_KEY_USAGE = '2.5.29.15';
const OID_SUBJECT_KEY_IDENTIFIER = '2.5.29.14';
const OID_AUTHORITY_KEY_IDENTIFIER = '2.5.29.35';
const OID_EXT_KEY_USAGE = '2.5.29.37';
const OID_SUBJECT_ALT_NAME = '2.5.29.17';
const OID_NAME_CONSTRAINTS = '2.5.29.30';

const IPV4_OCTETS = 4;
const IPV6_GROUPS = 8;
const BYTE_MASK = 0xff;
const BYTE_BITS = 8;
const HIGH_BIT = 0x80;
const IPV6_RADIX = 16;

/**
 * X.509 v3 extension encoders for the FlyingFish own PKI library (own-pki-lib
 * slice 7), composed from {@link Der} / {@link X509Der}. These are exactly the
 * extensions {@link PkiCertificateBuilder} needs (BasicConstraints, KeyUsage,
 * ExtendedKeyUsage, Subject/Authority Key Identifier, SubjectAltName,
 * NameConstraints) so the builder can migrate off @peculiar. Each method returns a
 * complete Extension TLV ready for {@link X509Der.extensions}.
 */
export class X509Ext {

    /**
     * KeyUsage bit position for digitalSignature (bit 0).
     */
    public static readonly KU_DIGITAL_SIGNATURE = 0;

    /**
     * KeyUsage bit position for keyCertSign (bit 5).
     */
    public static readonly KU_KEY_CERT_SIGN = 5;

    /**
     * KeyUsage bit position for cRLSign (bit 6).
     */
    public static readonly KU_CRL_SIGN = 6;

    /**
     * ExtendedKeyUsage OID for TLS server authentication.
     */
    public static readonly EKU_SERVER_AUTH = '1.3.6.1.5.5.7.3.1';

    /**
     * ExtendedKeyUsage OID for TLS client authentication.
     */
    public static readonly EKU_CLIENT_AUTH = '1.3.6.1.5.5.7.3.2';

    /**
     * BasicConstraints ::= SEQUENCE { cA BOOLEAN DEFAULT FALSE, pathLenConstraint
     * INTEGER OPTIONAL }. cA=false is a DEFAULT and thus omitted (an empty
     * SEQUENCE). Critical by default (RFC 5280).
     * @param ca - whether the subject is a CA
     * @param pathLength - the pathLenConstraint (CA only), if any
     * @param critical - the critical flag, true by default
     */
    public static basicConstraints(ca: boolean, pathLength?: number, critical: boolean = true): Uint8Array {
        const items: Uint8Array[] = [];

        if (ca) {
            items.push(Der.boolean(true));
        }

        if (pathLength !== undefined) {
            items.push(Der.integer(pathLength));
        }

        return X509Der.extension(OID_BASIC_CONSTRAINTS, critical, Der.sequence(items));
    }

    /**
     * KeyUsage ::= BIT STRING, bit 0 the most significant. Given the set bit
     * positions, encodes the minimal BIT STRING (trailing zero bits are the unused
     * bits). Critical by default (RFC 5280).
     * @param bits - the set bit positions (e.g. {@link X509Ext.KU_KEY_CERT_SIGN})
     * @param critical - the critical flag, true by default
     */
    public static keyUsage(bits: number[], critical: boolean = true): Uint8Array {
        const maxBit = Math.max(...bits);
        const byteLength = Math.floor(maxBit / BYTE_BITS) + 1;
        const value = new Uint8Array(byteLength);

        for (const bit of bits) {
            value[Math.floor(bit / BYTE_BITS)] |= HIGH_BIT >> (bit % BYTE_BITS);
        }

        const unusedBits = (byteLength * BYTE_BITS) - (maxBit + 1);

        return X509Der.extension(OID_KEY_USAGE, critical, Der.bitString(value, unusedBits));
    }

    /**
     * ExtendedKeyUsage ::= SEQUENCE OF KeyPurposeId (OID). Non-critical by default.
     * @param oids - the key-purpose OIDs (e.g. {@link X509Ext.EKU_CLIENT_AUTH})
     * @param critical - the critical flag, false by default
     */
    public static extendedKeyUsage(oids: string[], critical: boolean = false): Uint8Array {
        const value = Der.sequence(oids.map((oid) => Der.objectIdentifier(oid)));

        return X509Der.extension(OID_EXT_KEY_USAGE, critical, value);
    }

    /**
     * SubjectKeyIdentifier ::= OCTET STRING (the key identifier). Non-critical.
     * @param keyIdentifier - the key identifier bytes (see {@link X509Ext.keyIdentifier})
     * @param critical - the critical flag, false by default
     */
    public static subjectKeyIdentifier(keyIdentifier: Uint8Array, critical: boolean = false): Uint8Array {
        return X509Der.extension(OID_SUBJECT_KEY_IDENTIFIER, critical, Der.octetString(keyIdentifier));
    }

    /**
     * AuthorityKeyIdentifier ::= SEQUENCE { keyIdentifier [0] IMPLICIT OCTET STRING
     * OPTIONAL }. Non-critical. Only the keyIdentifier field is emitted (the issuer
     * name/serial fields are optional and not used here).
     * @param keyIdentifier - the issuer's key identifier bytes
     * @param critical - the critical flag, false by default
     */
    public static authorityKeyIdentifier(keyIdentifier: Uint8Array, critical: boolean = false): Uint8Array {
        const value = Der.sequence([Der.implicit(0, keyIdentifier)]);

        return X509Der.extension(OID_AUTHORITY_KEY_IDENTIFIER, critical, value);
    }

    /**
     * SubjectAltName ::= SEQUENCE OF GeneralName. Non-critical by default.
     * @param entries - the alternative names
     * @param critical - the critical flag, false by default
     */
    public static subjectAltName(entries: X509GeneralName[], critical: boolean = false): Uint8Array {
        const value = Der.sequence(entries.map((entry) => X509Ext._generalName(entry)));

        return X509Der.extension(OID_SUBJECT_ALT_NAME, critical, value);
    }

    /**
     * NameConstraints ::= SEQUENCE { permittedSubtrees [0] IMPLICIT SEQUENCE OF
     * GeneralSubtree }. GeneralSubtree ::= SEQUENCE { base GeneralName }. Limits the
     * DNS/URI name space an intermediate may issue for. Critical by default.
     * @param permittedDns - permitted DNS name suffixes
     * @param permittedUri - permitted URI namespaces
     * @param critical - the critical flag, true by default
     */
    public static nameConstraints(
        permittedDns: string[],
        permittedUri: string[],
        critical: boolean = true
    ): Uint8Array {
        const subtrees: Uint8Array[] = [];

        for (const dns of permittedDns) {
            subtrees.push(Der.sequence([X509Ext._generalName({type: 'dns', value: dns})]));
        }

        for (const uri of permittedUri) {
            subtrees.push(Der.sequence([X509Ext._generalName({type: 'url', value: uri})]));
        }

        const value = Der.sequence([Der.explicit(0, Der.concat(subtrees))]);

        return X509Der.extension(OID_NAME_CONSTRAINTS, critical, value);
    }

    /**
     * The key identifier of a public key: the 160-bit SHA-1 hash of the
     * subjectPublicKey BIT STRING value (RFC 5280 method 1), the same identifier
     * @peculiar computes.
     * @param publicKey - the public key
     */
    public static async keyIdentifier(publicKey: webcrypto.CryptoKey): Promise<Uint8Array> {
        return X509Ext.keyIdentifierFromSpki(new Uint8Array(await webcrypto.subtle.exportKey('spki', publicKey)));
    }

    /**
     * The key identifier for a key given its SubjectPublicKeyInfo DER (RFC 5280
     * method 1), for when only the encoded key is at hand (e.g. an issuer read out
     * of its certificate).
     * @param subjectPublicKeyInfo - the SPKI DER
     */
    public static async keyIdentifierFromSpki(subjectPublicKeyInfo: Uint8Array): Promise<Uint8Array> {
        const subjectPublicKey = DerReader.toBitString(DerReader.parse(subjectPublicKeyInfo).children[1]).bytes;
        const hash = await webcrypto.subtle.digest('SHA-1', subjectPublicKey);

        return new Uint8Array(hash);
    }

    /**
     * Encode one GeneralName in its context-tagged CHOICE form: rfc822Name [1] /
     * dNSName [2] / uniformResourceIdentifier [6] as IA5String, iPAddress [7] as an
     * OCTET STRING of the raw address bytes.
     * @param entry - the general name
     */
    private static _generalName(entry: X509GeneralName): Uint8Array {
        if (entry.type === 'ip') {
            return Der.implicit(7, X509Ext._parseIp(entry.value));
        }

        const text = new TextEncoder().encode(entry.value);

        if (entry.type === 'email') {
            return Der.implicit(1, text);
        }

        if (entry.type === 'url') {
            return Der.implicit(6, text);
        }

        return Der.implicit(2, text);
    }

    /**
     * Parse an IPv4 or IPv6 literal to its raw address bytes (4 or 16).
     * @param value - the IP literal
     */
    private static _parseIp(value: string): Uint8Array {
        if (value.includes(':')) {
            return X509Ext._parseIpv6(value);
        }

        const octets = value.split('.').map((part) => Number(part));

        if (octets.length !== IPV4_OCTETS || octets.some((o) => !Number.isInteger(o) || o < 0 || o > BYTE_MASK)) {
            throw new Error(`X509Ext: invalid IPv4 address "${value}"`);
        }

        return Uint8Array.from(octets);
    }

    /**
     * Parse an IPv6 literal (with optional `::` zero-run compression) to 16 bytes.
     * @param value - the IPv6 literal
     */
    private static _parseIpv6(value: string): Uint8Array {
        const halves = value.split('::');

        if (halves.length > 2) {
            throw new Error(`X509Ext: invalid IPv6 address "${value}"`);
        }

        const toGroups = (part: string): number[] => {
            return part.length === 0 ? [] : part.split(':').map((g) => parseInt(g, IPV6_RADIX));
        };
        const head = toGroups(halves[0]);
        const compressed = halves.length === 2;
        const tail = compressed ? toGroups(halves[1]) : [];
        const missing = IPV6_GROUPS - head.length - tail.length;

        if ((compressed && missing < 0) || (!compressed && head.length !== IPV6_GROUPS)) {
            throw new Error(`X509Ext: invalid IPv6 address "${value}"`);
        }

        const groups = compressed ? [...head, ...new Array(missing).fill(0), ...tail] : head;
        const out = new Uint8Array(IPV6_GROUPS * 2);

        groups.forEach((group, index) => {
            out[index * 2] = (group >> BYTE_BITS) & BYTE_MASK;
            out[(index * 2) + 1] = group & BYTE_MASK;
        });

        return out;
    }

}