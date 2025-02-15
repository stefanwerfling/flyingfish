import {SslCertCreateGlobal, USHttpServer} from 'flyingfish_core';
import {Auth} from './Routes/LetsEncrypt/Auth.js';
import {CleanUp} from './Routes/LetsEncrypt/CleanUp.js';

/**
 * Hook Server for Letsencrypt DNS-01
 */
export class HookServer extends USHttpServer {

    public static UNIX_ADDRESS = 'letsencrypt_hook';

    /**
     * Constructor
     * @param {string} basePath
     * @param {SslCertCreateGlobal} global
     */
    public constructor(basePath: string, global: SslCertCreateGlobal) {
        super({
            realm: 'FlyingFish LetsEncrypt Hook',
            routes: [
                new Auth(global),
                new CleanUp(global)
            ],
            socket: {
                mainPath: basePath,
                socketName: HookServer.UNIX_ADDRESS
            }
        });
    }

}