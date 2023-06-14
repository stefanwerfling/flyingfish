import {DSAKeyPairOptions, RSAKeyPairOptions} from 'crypto';
import * as crypto from 'crypto';
import forge from 'node-forge';

/**
 * CertificateHelperKeyType
 */
export enum CertificateHelperKeyType {
    rsa = 'rsa',
    dsa = 'dsa'
}

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
    public static async generateKeyPair(
        modulusLength: number = 4096,
        type: CertificateHelperKeyType = CertificateHelperKeyType.rsa
    ): Promise<CertificateHelperKeyPair> {
        const options = {
            modulusLength: modulusLength,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        };

        let keys;

        switch (type) {
            case CertificateHelperKeyType.rsa:
                keys = crypto.generateKeyPairSync('rsa', options as RSAKeyPairOptions<'pem', 'pem'>);
                break;

            case CertificateHelperKeyType.dsa:
                keys = crypto.generateKeyPairSync('dsa', options as DSAKeyPairOptions<'pem', 'pem'>);
                break;
        }

        return {
            public: keys ? keys.publicKey : '',
            private: keys ? keys.privateKey : ''
        };
    }

    /**
     * generateSshKeyPair
     * @param modulusLength
     * @param type
     * @param passphrase
     */
    public static async generateSshKeyPair(
        modulusLength: number = 4096,
        type: CertificateHelperKeyType = CertificateHelperKeyType.rsa,
        passphrase: string = ''
    ): Promise<CertificateHelperKeyPair> {
        const keys = await CertificateHelper.generateKeyPair(modulusLength, type);

        const prKey = forge.pki.privateKeyFromPem(keys.private);
        const pubKey = forge.pki.publicKeyFromPem(keys.public);

        return {
            private: forge.ssh.privateKeyToPutty(prKey, passphrase, ''),
            public: forge.ssh.publicKeyToOpenSSH(pubKey, '')
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
    public static async generateCertificate(
        privateKey: string,
        publicKey: string,
        attrs: CertificateHelperAttr[],
        validYears: number = 1,
        serialNumber: string = '01',
        signerPrivateKey: string = ''
    ): Promise<string> {
        const prKey = forge.pki.privateKeyFromPem(privateKey);
        const pubKey = forge.pki.publicKeyFromPem(publicKey);

        const cert = forge.pki.createCertificate();
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
            const sigPrKey = forge.pki.privateKeyFromPem(privateKey);

            cert.sign(sigPrKey);
        }

        return forge.pki.certificateToPem(cert);
    }

}