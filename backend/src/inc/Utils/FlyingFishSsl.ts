import {Logger} from 'flyingfish_core';
import * as Path from 'path';
import {OpenSSL} from '../OpenSSL/OpenSSL.js';
import {OpenSslCnf} from '../OpenSSL/OpenSslCnf.js';

/**
 * FlyingFishSsl
 */
export class FlyingFishSsl {

    public static readonly FILE_KEYPEM = 'flyingfish.pem';
    public static readonly FILE_CRT = 'flyingfish.crt';
    public static readonly FILE_CSR = 'flyingfish.csr';
    public static readonly FILE_CA = 'flyingfish.ca';

    /**
     * createExpressCerts
     * @param sslLibPath
     */
    public static async createExpressCerts(sslLibPath: string): Promise<void> {
        const cnf = await OpenSslCnf.createTmpCnf({
            req: {
                distinguished_name: 'req_distinguished_name',
                x509_extensions: 'v3_req',
                prompt: 'no'
            },
            req_distinguished_name: {
                C: 'ZZ',
                ST: 'none',
                L: 'none',
                O: 'FlyingFish',
                OU: 'FlyingFish',
                CN: 'flyingfish.localhost'
            },
            v3_req: {
                keyUsage: 'critical, digitalSignature, keyAgreement',
                extendedKeyUsage: 'serverAuth',
                subjectAltName: '@alt_names'
            },
            alt_names: {
                'DNS.1': 'flyingfish.localhost',
                'DNS.2': 'localhost'
            }
        });

        if (cnf) {
            const key = Path.join(sslLibPath, FlyingFishSsl.FILE_KEYPEM);

            Logger.getLogger().silly('FlyingFishSsl::createExpressCerts: genRsa ...');

            if (await OpenSSL.genRsa(key, 2048)) {
                Logger.getLogger().silly('FlyingFishSsl::createExpressCerts: genRsa finish.');

                const crt = Path.join(sslLibPath, FlyingFishSsl.FILE_CRT);

                /*
                 * const csr = Path.join(sslLibPath, FlyingFishSsl.FILE_CSR);
                 * const ca = Path.join(sslLibPath, FlyingFishSsl.FILE_CA);
                 */

                Logger.getLogger().silly('FlyingFishSsl::createExpressCerts: createCrt ...');

                if (await OpenSSL.createCrt(key, crt, cnf)) {
                    Logger.getLogger().info('FlyingFishSsl::createExpressCerts: Crt created.');
                } else {
                    Logger.getLogger().error('FlyingFishSsl::createExpressCerts: Crt file can not created.');
                    // return;
                }

                // Logger.getLogger().silly('FlyingFishSsl::createExpressCerts: createCsr ...');

                /*
                 * if (await OpenSSL.createCsr(csr, cnf)) {
                 *     Logger.getLogger().info('FlyingFishSsl::createExpressCerts: Csr created.');
                 * } else {
                 *    Logger.getLogger().error('FlyingFishSsl::createExpressCerts: Csr file can not created.');
                 * }
                 */

                /*
                 * if (await OpenSSL.createCa(ca, csr, crt, key, cnf)) {
                 *     Logger.getLogger().info('Ca create');
                 * } else {
                 *     Logger.getLogger().error('FlyingFishSsl::createExpressCerts: Ca file can not create!');
                 * }
                 */
            } else {
                Logger.getLogger().error('FlyingFishSsl::createExpressCerts: Key file can not create!');
            }
        } else {
            Logger.getLogger().error('FlyingFishSsl::createExpressCerts: Cnf file can not create!');
        }
    }

}