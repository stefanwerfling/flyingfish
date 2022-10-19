import {readFileSync} from 'fs';
import * as pvtsutils from 'pvtsutils';
import * as pkijs from 'pkijs';
import * as asn1js from 'asn1js';

/**
 * Certificate
 */
export class Certificate {

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
     * isValidate
     */
    public isValidate(): boolean {
        const certTimeAfter = this._certificate.notAfter;
        const ctime = new Date(Date.now());

        return certTimeAfter.value.getTime() > ctime.getTime();
    }

    /**
     * pemToDer
     * @param pemString
     */
    static pemToDer(pemString: string): ArrayBuffer {
        // eslint-disable-next-line require-unicode-regexp
        const derBase64 = pemString.replace(/(-----(BEGIN|END) [\w ]+-----|\n)/g, '').replace(/[\r\n]/g, '');
        return pvtsutils.Convert.FromBase64(derBase64);
    }

    /**
     * pemToAsn1
     * @param pemString
     */
    static pemToAsn1(pemString: string): any {
        const der = Certificate.pemToDer(pemString);
        const asn1 = asn1js.fromBER(der);

        pkijs.AsnError.assert(asn1, 'DER-encoded data');

        return asn1.result;
    }

}