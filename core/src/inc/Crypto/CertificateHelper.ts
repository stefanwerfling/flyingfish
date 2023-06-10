import * as crypto from 'crypto';
import * as forge from 'node-forge';

/**
 * CertificateHelperKeyPair
 */
export type CertificateHelperKeyPair = {
    public: string;
    private: string;
};

/**
 * CertificateHelperAttr
 */
export type CertificateHelperAttr = {
    name: string;
    value: string;
};

/**
 * CertificateHelper
 */
export class CertificateHelper {

    /**
     * generateKeyPair
     * @param modulusLength
     */
    public async generateKeyPair(modulusLength: number = 4096): Promise<CertificateHelperKeyPair> {
        const {publicKey, privateKey} = crypto.generateKeyPairSync('rsa', {
            modulusLength: modulusLength,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        return {
            public: publicKey,
            private: privateKey
        };
    }

    /**
     * generateCertificate
     * @param privateKey
     * @param publicKey
     * @param attrs
     * @param validYears
     * @param serialNumber
     * @param signerPrivateKey
     */
    public async generateCertificate(
        privateKey: string,
        publicKey: string,
        attrs: CertificateHelperAttr[],
        validYears: number = 1,
        serialNumber: string = '01',
        signerPrivateKey: string = ''
    ): Promise<string> {
        const pki = forge.pki;
        const prKey = pki.privateKeyFromPem(privateKey);
        const pubKey = pki.publicKeyFromPem(publicKey);

        const cert = pki.createCertificate();
        cert.publicKey = pubKey;
        cert.serialNumber = serialNumber;
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setFullYear(
            cert.validity.notBefore.getFullYear() + validYears
        );

        cert.setSubject(attrs);
        cert.setIssuer(attrs);

        if (signerPrivateKey === '') {
            cert.sign(prKey);
        } else {
            const sigPrKey = pki.privateKeyFromPem(privateKey);

            cert.sign(sigPrKey);
        }

        return pki.certificateToPem(cert);
    }

}