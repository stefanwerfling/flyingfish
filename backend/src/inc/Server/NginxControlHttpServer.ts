import {USHttpServer} from 'flyingfish_core';

import {AddressAccess as NjsAddressAccessController} from '../../Routes/Njs/AddressAccess.js';
import {AuthBasic as NjsAuthBasicController} from '../../Routes/Njs/AuthBasic.js';
import {Config} from '../Config/Config.js';

/**
 * Nginx Control HTTP Server
 */
export class NginxControlHttpServer extends USHttpServer {

    public static UNIX_ADDRESS = 'nginx_control';

    /**
     * Constructor
     */
    public constructor() {
        super({
            realm: 'FlyingFish Nginx control',
            routes: [
                new NjsAddressAccessController(),
                new NjsAuthBasicController(),
            ],
            socket: {
                mainPath: Config.getInstance().get()!.nginx!.prefix,
                socketName: NginxControlHttpServer.UNIX_ADDRESS
            }
        });
    }

}