import {USHttpServer} from 'flyingfish_core';

export class HookServer extends USHttpServer {

    public static UNIX_ADDRESS = 'letsencrypt_hook';

    /**
     * Constructor
     * @param {string} basePath
     */
    public constructor(basePath: string) {
        super({
            realm: 'FlyingFish LetsEncrypt Hook',
            routes: [

            ],
            socket: {
                mainPath: basePath,
                socketName: HookServer.UNIX_ADDRESS
            }
        });
    }

}