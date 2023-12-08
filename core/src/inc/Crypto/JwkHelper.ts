import forge from 'node-forge';
import * as crypto from 'crypto';

/**
 * JWK Helper class.
 */
export class JwkHelper {

    public static async generateJwk(): Promise<crypto.webcrypto.JsonWebKey> {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: 'ECDSA',
                namedCurve: 'P-256'
            },
            true,
            ['sign', 'verify']
        );

        return await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    }

}