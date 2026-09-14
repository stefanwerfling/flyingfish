import {Der} from './Der.js';

/**
 * One relative-distinguished-name attribute (the common one-attribute-per-RDN
 * case): the attribute type OID and its string value.
 */
export type X509RdnAttribute = {
    oid: string;
    value: string;
    printable?: boolean;
};

/**
 * The fields of a TBSCertificate (the to-be-signed body). Names / SPKI /
 * extensions are passed already DER-encoded (SPKI comes straight from a
 * WebCrypto `spki` export); the serial is raw magnitude bytes.
 */
export type X509TbsFields = {
    serialNumber: Uint8Array;
    signatureAlgorithm: Uint8Array;
    issuer: Uint8Array;
    notBefore: Date;
    notAfter: Date;
    subject: Uint8Array;
    subjectPublicKeyInfo: Uint8Array;
    extensions?: Uint8Array;
};

/**
 * One CRL entry: the revoked certificate's serial number (raw magnitude bytes)
 * and when it was revoked.
 */
export type X509CrlEntry = {
    serialNumber: Uint8Array;
    revocationDate: Date;
};

/**
 * The fields of a TBSCertList (the to-be-signed CRL body). The issuer is passed
 * already DER-encoded (a Name); the signature AlgorithmIdentifier must match the
 * outer one.
 */
export type X509TbsCertListFields = {
    signatureAlgorithm: Uint8Array;
    issuer: Uint8Array;
    thisUpdate: Date;
    nextUpdate?: Date;
    entries: X509CrlEntry[];
};

const UTC_TIME_YEAR_LIMIT = 2050;

/**
 * X.509 structure encoders for the FlyingFish own PKI library (own-pki-lib slice
 * 3), composed from the DER primitives ({@link Der}). This layer knows the RFC
 * 5280 shapes (AlgorithmIdentifier, Name, Validity, Extension(s), TBSCertificate,
 * Certificate); signing/verifying and the CSR/CRL wrappers sit on top (slices
 * 4/5). Byte-for-byte DER so the output interoperates with any X.509 verifier.
 */
export class X509Der {

    /**
     * AlgorithmIdentifier ::= SEQUENCE { algorithm OID, parameters ANY OPTIONAL }.
     * Ed25519 omits parameters entirely (do not pass NULL).
     * @param oid - the algorithm OID
     * @param parameters - the already-encoded parameters, if any
     */
    public static algorithmIdentifier(oid: string, parameters?: Uint8Array): Uint8Array {
        const items = [Der.objectIdentifier(oid)];

        if (parameters !== undefined) {
            items.push(parameters);
        }

        return Der.sequence(items);
    }

    /**
     * Name ::= SEQUENCE OF RelativeDistinguishedName, one attribute per RDN.
     * RelativeDistinguishedName ::= SET OF AttributeTypeAndValue.
     * AttributeTypeAndValue ::= SEQUENCE { type OID, value }.
     * @param attributes - the RDN attributes in order (e.g. CN, O)
     */
    public static distinguishedName(attributes: X509RdnAttribute[]): Uint8Array {
        return Der.sequence(attributes.map((attribute) => {
            const value = attribute.printable
                ? Der.printableString(attribute.value)
                : Der.utf8String(attribute.value);

            return Der.set([Der.sequence([Der.objectIdentifier(attribute.oid), value])]);
        }));
    }

    /**
     * Validity ::= SEQUENCE { notBefore Time, notAfter Time }. Per RFC 5280, Time
     * is UTCTime for years before 2050, else GeneralizedTime.
     * @param notBefore - start of validity
     * @param notAfter - end of validity
     */
    public static validity(notBefore: Date, notAfter: Date): Uint8Array {
        return Der.sequence([X509Der._time(notBefore), X509Der._time(notAfter)]);
    }

    /**
     * Extension ::= SEQUENCE { extnID OID, critical BOOLEAN DEFAULT FALSE,
     * extnValue OCTET STRING }. The critical flag is omitted when false (DER
     * drops DEFAULT values).
     * @param oid - the extension OID
     * @param critical - whether the extension is critical
     * @param value - the raw extension value (wrapped in the OCTET STRING)
     */
    public static extension(oid: string, critical: boolean, value: Uint8Array): Uint8Array {
        const items = [Der.objectIdentifier(oid)];

        if (critical) {
            items.push(Der.boolean(true));
        }

        items.push(Der.octetString(value));

        return Der.sequence(items);
    }

    /**
     * The certificate `extensions` field: [3] EXPLICIT SEQUENCE OF Extension.
     * @param items - the already-encoded Extension values
     */
    public static extensions(items: Uint8Array[]): Uint8Array {
        return Der.explicit(3, Der.sequence(items));
    }

    /**
     * TBSCertificate ::= SEQUENCE { version [0] EXPLICIT INTEGER (v3=2),
     * serialNumber INTEGER, signature AlgorithmIdentifier, issuer Name, validity,
     * subject Name, subjectPublicKeyInfo, extensions [3] EXPLICIT }.
     * @param fields - the TBS fields (names / SPKI / extensions pre-encoded)
     */
    public static tbsCertificate(fields: X509TbsFields): Uint8Array {
        const items = [
            Der.explicit(0, Der.integer(2)),
            Der.integerFromBytes(fields.serialNumber),
            fields.signatureAlgorithm,
            fields.issuer,
            X509Der.validity(fields.notBefore, fields.notAfter),
            fields.subject,
            fields.subjectPublicKeyInfo
        ];

        if (fields.extensions !== undefined) {
            items.push(fields.extensions);
        }

        return Der.sequence(items);
    }

    /**
     * Certificate ::= SEQUENCE { tbsCertificate, signatureAlgorithm, signature
     * BIT STRING }.
     * @param tbsCertificate - the encoded TBSCertificate
     * @param signatureAlgorithm - the encoded AlgorithmIdentifier
     * @param signature - the raw signature bytes
     */
    public static certificate(
        tbsCertificate: Uint8Array,
        signatureAlgorithm: Uint8Array,
        signature: Uint8Array
    ): Uint8Array {
        return Der.sequence([tbsCertificate, signatureAlgorithm, Der.bitString(signature)]);
    }

    /**
     * TBSCertList (v2 CRL body) ::= SEQUENCE { version INTEGER (v2=1), signature
     * AlgorithmIdentifier, issuer Name, thisUpdate Time, nextUpdate Time OPTIONAL,
     * revokedCertificates SEQUENCE OF SEQUENCE{ userCertificate INTEGER,
     * revocationDate Time } OPTIONAL }.
     * @param fields - the TBSCertList fields
     */
    public static tbsCertList(fields: X509TbsCertListFields): Uint8Array {
        const items = [
            Der.integer(1),
            fields.signatureAlgorithm,
            fields.issuer,
            X509Der._time(fields.thisUpdate)
        ];

        if (fields.nextUpdate !== undefined) {
            items.push(X509Der._time(fields.nextUpdate));
        }

        if (fields.entries.length > 0) {
            items.push(Der.sequence(fields.entries.map((entry) => {
                return Der.sequence([Der.integerFromBytes(entry.serialNumber), X509Der._time(entry.revocationDate)]);
            })));
        }

        return Der.sequence(items);
    }

    /**
     * CertificateList ::= SEQUENCE { tbsCertList, signatureAlgorithm, signature
     * BIT STRING } — the signed CRL.
     * @param tbsCertList - the encoded TBSCertList
     * @param signatureAlgorithm - the encoded AlgorithmIdentifier
     * @param signature - the raw signature bytes
     */
    public static certificateList(
        tbsCertList: Uint8Array,
        signatureAlgorithm: Uint8Array,
        signature: Uint8Array
    ): Uint8Array {
        return Der.sequence([tbsCertList, signatureAlgorithm, Der.bitString(signature)]);
    }

    /**
     * Encode a Time as UTCTime or GeneralizedTime per the RFC 5280 year rule.
     * @param date - the time
     */
    private static _time(date: Date): Uint8Array {
        return date.getUTCFullYear() < UTC_TIME_YEAR_LIMIT ? Der.utcTime(date) : Der.generalizedTime(date);
    }

}