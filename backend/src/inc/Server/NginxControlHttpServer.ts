import {USHttpServer, USHttpServerOptions} from 'figtree';
import {NGINX_CONTROL_UNIX_SOCKET_NAME} from 'flyingfish_core';

import {AddressAccess as NjsAddressAccessController} from '../../Routes/Njs/AddressAccess.js';
import {AuthBasic as NjsAuthBasicController} from '../../Routes/Njs/AuthBasic.js';
import {FlyingFishConfig} from '../../Application/Config/FlyingFishConfig.js';

/**
 * Nginx Control HTTP Server
 *
 * Only used in LOCAL nginx mode (nginx running in the backend container). In
 * remote mode (nginx extracted into its own container) the equivalent server
 * runs there instead — see nginxserver's NjsControlHttpServer — but both use
 * the same socket name (NGINX_CONTROL_UNIX_SOCKET_NAME) so the generated
 * nginx config's control URL is identical either way.
 */
export class NginxControlHttpServer extends USHttpServer {

    public static UNIX_ADDRESS = NGINX_CONTROL_UNIX_SOCKET_NAME;

    /**
     * Constructor
     */
    public constructor() {
        // This internal unix-socket server must NOT run session middleware: nginx
        // auth_request subrequests carry no cookie, so a session per request would
        // just leak into the store. figtree's BaseHttpServer already guards session
        // setup behind `if (serverInit.session)`, but its options type marks
        // `session` as required — hence the cast omitting it. (figtree should make
        // `BaseHttpServerOptions.session` optional to drop this cast.)
        super({
            realm: 'FlyingFish Nginx control',
            routes: [
                new NjsAddressAccessController(),
                new NjsAuthBasicController()
            ],
            socket: {
                mainPath: FlyingFishConfig.getInstance().get()!.nginx!.prefix,
                socketName: NginxControlHttpServer.UNIX_ADDRESS
            }
        } as unknown as USHttpServerOptions);
    }

}