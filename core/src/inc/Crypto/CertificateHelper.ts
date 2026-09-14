import {DSAKeyPairOptions, RSAKeyPairOptions} from 'crypto';
import * as crypto from 'crypto';

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
 * CertificateHelper. Generates classic RSA/DSA key pairs over Node's built-in
 * crypto (used by the legacy Express-cert path). SSH key-format conversion
 * (PuTTY/OpenSSH) and RSA X.509 certificate creation live in figtree's
 * CertificateHelper, which FlyingFish is migrating onto; this class no longer
 * carries them, so it has no node-forge dependency.
 */
export class CertificateHelper {

    /**
     * generateKeyPair
     * @param modulusLength
     * @param type
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

}