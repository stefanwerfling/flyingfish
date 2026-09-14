/* eslint-disable no-bitwise -- IPv6 group assembly from octets is a bit operation by nature. */
import {DerReader} from './DerReader.js';
import {X509GeneralName, X509GeneralNameType} from './X509Ext.js';
import {X509Name} from './X509Name.js';
import {X509RdnAttribute} from './X509Der.js';

const EXTENSIONS_TAG = 0xa3;
const OCTET_STRING_TAG = 0x04;
const BOOLEAN_TAG = 0x01;
const INTEGER_TAG = 0x02;
const IPV4_LENGTH = 4;
const IPV6_LENGTH = 16;
const HEX_GROUP = 2;
const HEX_RADIX = 16;
const BYTE_BITS = 8;

const OID_BASIC_CONSTRAINTS = '2.5.29.19';
const OID_SUBJECT_ALT_NAME = '2.5.29.17';

const TBS_ISSUER_INDEX = 3;
const TBS_VALIDITY_INDEX = 4;
const TBS_SUBJECT_INDEX = 5;
const TBS_SPKI_INDEX = 6;
const CSR_SUBJECT_INDEX = 1;
const CSR_SPKI_INDEX = 2;

const GENERAL_NAME_TAGS: Record<number, X509GeneralNameType> = {
    0x81: 'email',
    0x82: 'dns',
    0x86: 'url',
    0x87: 'ip'
};

/**
 * The validity window of a certificate.
 */
export type X509Validity = {
    notBefore: Date;
    notAfter: Date;
};

/**
 * A certificate's BasicConstraints.
 */
export type X509BasicConstraints = {
    ca: boolean;
    pathLength: number | null;
};

/**
 * Reads fields out of a certificate / CSR DER for the FlyingFish own PKI library
 * (own-pki-lib slice 7c) — validity window, subject/issuer Name, SPKI, and the
 * BasicConstraints / SubjectAltName extensions. This is the read side the PKI
 * consumers (client-cert verifier, CA tree, node client) use, replacing the
 * @peculiar X509Certificate parser. Assumes v3 certificates (a version [0] field).
 */
export class X509Reader {

    /**
     * The certificate's validity window.
     * @param certificateDer - the certificate DER
     */
    public static validity(certificateDer: Uint8Array): X509Validity {
        const validity = X509Reader._tbs(certificateDer).children[TBS_VALIDITY_INDEX];

        return {
            notBefore: DerReader.toDate(validity.children[0]),
            notAfter: DerReader.toDate(validity.children[1])
        };
    }

    /**
     * The raw DER of the certificate's subject Name.
     * @param certificateDer - the certificate DER
     */
    public static subjectName(certificateDer: Uint8Array): Uint8Array {
        return X509Reader._tbs(certificateDer).children[TBS_SUBJECT_INDEX].raw;
    }

    /**
     * The raw DER of the certificate's issuer Name.
     * @param certificateDer - the certificate DER
     */
    public static issuerName(certificateDer: Uint8Array): Uint8Array {
        return X509Reader._tbs(certificateDer).children[TBS_ISSUER_INDEX].raw;
    }

    /**
     * The certificate's subject as attributes.
     * @param certificateDer - the certificate DER
     */
    public static subjectAttributes(certificateDer: Uint8Array): X509RdnAttribute[] {
        return X509Name.fromDer(X509Reader.subjectName(certificateDer));
    }

    /**
     * The certificate's SubjectPublicKeyInfo (full TLV, as WebCrypto's spki import
     * expects).
     * @param certificateDer - the certificate DER
     */
    public static subjectPublicKeyInfo(certificateDer: Uint8Array): Uint8Array {
        return X509Reader._tbs(certificateDer).children[TBS_SPKI_INDEX].raw;
    }

    /**
     * The certificate's BasicConstraints, or null if absent.
     * @param certificateDer - the certificate DER
     */
    public static basicConstraints(certificateDer: Uint8Array): X509BasicConstraints | null {
        const value = X509Reader._extensionValue(certificateDer, OID_BASIC_CONSTRAINTS);

        if (value === null) {
            return null;
        }

        const fields = DerReader.parse(value).children;
        const ca = fields.length > 0 && fields[0].tag === BOOLEAN_TAG ? DerReader.toBoolean(fields[0]) : false;
        const pathNode = fields.find((field) => field.tag === INTEGER_TAG);

        return {
            ca: ca,
            pathLength: pathNode === undefined ? null : Number(DerReader.toInteger(pathNode))
        };
    }

    /**
     * The certificate's subject alternative names, or an empty list if absent.
     * @param certificateDer - the certificate DER
     */
    public static subjectAltNames(certificateDer: Uint8Array): X509GeneralName[] {
        const value = X509Reader._extensionValue(certificateDer, OID_SUBJECT_ALT_NAME);

        if (value === null) {
            return [];
        }

        return DerReader.parse(value).children.map((name) => X509Reader._generalName(name.tag, name.content));
    }

    /**
     * The raw DER of a CSR's subject Name.
     * @param csrDer - the CertificationRequest DER
     */
    public static csrSubjectName(csrDer: Uint8Array): Uint8Array {
        return DerReader.parse(csrDer).children[0].children[CSR_SUBJECT_INDEX].raw;
    }

    /**
     * A CSR's subject as attributes.
     * @param csrDer - the CertificationRequest DER
     */
    public static csrSubjectAttributes(csrDer: Uint8Array): X509RdnAttribute[] {
        return X509Name.fromDer(X509Reader.csrSubjectName(csrDer));
    }

    /**
     * A CSR's SubjectPublicKeyInfo (full TLV).
     * @param csrDer - the CertificationRequest DER
     */
    public static csrSubjectPublicKeyInfo(csrDer: Uint8Array): Uint8Array {
        return DerReader.parse(csrDer).children[0].children[CSR_SPKI_INDEX].raw;
    }

    /**
     * The TBSCertificate node of a certificate.
     * @param certificateDer - the certificate DER
     */
    private static _tbs(certificateDer: Uint8Array): ReturnType<typeof DerReader.parse> {
        return DerReader.parse(certificateDer).children[0];
    }

    /**
     * The value bytes (inside the OCTET STRING) of an extension by OID, or null.
     * @param certificateDer - the certificate DER
     * @param oid - the extension OID
     */
    private static _extensionValue(certificateDer: Uint8Array, oid: string): Uint8Array | null {
        const wrapper = X509Reader._tbs(certificateDer).children.find((child) => child.tag === EXTENSIONS_TAG);

        if (wrapper === undefined) {
            return null;
        }

        for (const extension of wrapper.children[0].children) {
            if (DerReader.toOidString(extension.children[0]) === oid) {
                const octet = extension.children.find((child) => child.tag === OCTET_STRING_TAG);

                return octet === undefined ? null : octet.content;
            }
        }

        return null;
    }

    /**
     * Decode one GeneralName from its context tag + content: IA5-text kinds as a
     * string, iPAddress as an IPv4/IPv6 literal.
     * @param tag - the context tag byte
     * @param content - the name content bytes
     */
    private static _generalName(tag: number, content: Uint8Array): X509GeneralName {
        const type = GENERAL_NAME_TAGS[tag] ?? 'dns';

        if (type === 'ip') {
            return {type: 'ip', value: X509Reader._formatIp(content)};
        }

        return {type: type, value: new TextDecoder().decode(content)};
    }

    /**
     * Format raw address bytes as an IPv4 (4 bytes) or IPv6 (16 bytes) literal.
     * @param bytes - the raw address bytes
     */
    private static _formatIp(bytes: Uint8Array): string {
        if (bytes.length === IPV4_LENGTH) {
            return Array.from(bytes).join('.');
        }

        if (bytes.length !== IPV6_LENGTH) {
            throw new Error(`X509Reader: invalid IP address length ${bytes.length}`);
        }

        const groups: string[] = [];

        for (let index = 0; index < IPV6_LENGTH; index += HEX_GROUP) {
            groups.push((((bytes[index] << BYTE_BITS) | bytes[index + 1]) >>> 0).toString(HEX_RADIX));
        }

        return groups.join(':');
    }

}