import {readFileSync} from 'fs';
import * as pvtsutils from 'pvtsutils';
import * as pkijs from 'pkijs';
import * as asn1js from 'asn1js';

/**
 * Certificate
 */
export class Certificate {

    /**
     * rdn
     */
    public static rdnmap: Record<string, string> = {
        '2.5.4.6': 'C',
        '2.5.4.10': 'O',
        '2.5.4.11': 'OU',
        '2.5.4.3': 'CN',
        '2.5.4.7': 'L',
        '2.5.4.8': 'ST',
        '2.5.4.12': 'T',
        '2.5.4.42': 'GN',
        '2.5.4.43': 'I',
        '2.5.4.4': 'SN',
        '1.2.840.113549.1.9.1': 'E-mail'
    };

    /**
     * algo
     */
    public static algomap: Record<string, string> = {
        '1.2.840.113549.1.1.2': 'MD2 with RSA',
        '1.2.840.113549.1.1.4': 'MD5 with RSA',
        '1.2.840.10040.4.3': 'SHA1 with DSA',
        '1.2.840.10045.4.1': 'SHA1 with ECDSA',
        '1.2.840.10045.4.3.2': 'SHA256 with ECDSA',
        '1.2.840.10045.4.3.3': 'SHA384 with ECDSA',
        '1.2.840.10045.4.3.4': 'SHA512 with ECDSA',
        '1.2.840.113549.1.1.10': 'RSA-PSS',
        '1.2.840.113549.1.1.5': 'SHA1 with RSA',
        '1.2.840.113549.1.1.14': 'SHA224 with RSA',
        '1.2.840.113549.1.1.11': 'SHA256 with RSA',
        '1.2.840.113549.1.1.12': 'SHA384 with RSA',
        '1.2.840.113549.1.1.13': 'SHA512 with RSA'
    };

    /**
     * certificate
     * @private
     */
    private _certificate: pkijs.Certificate;

    /**
     * constructor
     */
    public constructor(certFile: string) {
        const certStr = readFileSync(certFile);

        this._certificate = new pkijs.Certificate({
            schema: Certificate.pemToAsn1(certStr.toString())
        });
    }

    /**
     * getIssuer
     */
    public getIssuer(): Map<string, string> {
        const issuer = new Map<string, string>();

        for (const typeAndValue of this._certificate.issuer.typesAndValues) {
            let typeval = Certificate.rdnmap[typeAndValue.type];

            if (typeof typeval === 'undefined') {
                typeval = typeAndValue.type;
            }

            const subjval = typeAndValue.value.valueBlock.value;

            issuer.set(typeval, subjval);
        }

        return issuer;
    }

    /**
     * getSubject
     */
    public getSubject(): Map<string, string> {
        const subject = new Map<string, string>();

        for (const typeAndValue of this._certificate.subject.typesAndValues) {
            let typeval = Certificate.rdnmap[typeAndValue.type];

            if (typeof typeval === 'undefined') {
                typeval = typeAndValue.type;
            }

            const subjval = typeAndValue.value.valueBlock.value;

            subject.set(typeval, subjval);
        }

        return subject;
    }

    /**
     * isValidate
     */
    public isValidate(): boolean {
        const certTimeAfter = this._certificate.notAfter;
        const ctime = new Date(Date.now());

        return certTimeAfter.value.getTime() > ctime.getTime();
    }

    /**
     * getSerialNumber
     */
    public getSerialNumber(): bigint {
        return this._certificate.serialNumber.toBigInt();
    }

    /**
     * getDateNotBefore
     */
    public getDateNotBefore(): Date {
        return this._certificate.notBefore.value;
    }

    /**
     * getDateNotAfter
     */
    public getDateNotAfter(): Date {
        return this._certificate.notAfter.value;
    }

    /**
     * getSignatureAlgorithm
     */
    public getSignatureAlgorithm(): string {
        const signatureAlgorithm = Certificate.algomap[this._certificate.signatureAlgorithm.algorithmId];

        if (typeof signatureAlgorithm === 'undefined') {
            return this._certificate.signatureAlgorithm.algorithmId;
        }

        return `${signatureAlgorithm} (${this._certificate.signatureAlgorithm.algorithmId})`;
    }

    /**
     * getExtensions
     */
    public getExtensions(): string[] {
        const extensions: string[] = [];

        if (this._certificate.extensions) {
            for (const item of this._certificate.extensions) {
                extensions.push(item.extnID);
            }
        }

        return extensions;
    }

    /**
     * pemToDer
     * @param pemString
     */
    public static pemToDer(pemString: string): ArrayBuffer {
        // eslint-disable-next-line require-unicode-regexp
        const derBase64 = pemString.replace(/(-----(BEGIN|END) [\w ]+-----|\n)/g, '').replace(/[\r\n]/g, '');
        return pvtsutils.Convert.FromBase64(derBase64);
    }

    /**
     * pemToAsn1
     * @param pemString
     */
    public static pemToAsn1(pemString: string): any {
        const der = Certificate.pemToDer(pemString);
        const asn1 = asn1js.fromBER(der);

        pkijs.AsnError.assert(asn1, 'DER-encoded data');

        return asn1.result;
    }

}