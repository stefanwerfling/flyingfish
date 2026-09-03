import {USHttpServer, USHttpServerOptions} from 'figtree';
import {NGINX_CONTROL_UNIX_SOCKET_NAME} from 'flyingfish_core';
import {AddressAccess} from '../../Routes/Njs/AddressAccess.js';
import {AuthBasic} from '../../Routes/Njs/AuthBasic.js';

/**
 * NjsControlHttpServer
 *
 * Unix-socket control server for nginx's njs `address_access`/`auth_basic`
 * subrequests — the remote-mode counterpart of the backend's
 * NginxControlHttpServer. Runs in this container (co-located with nginx
 * itself), so this stays a purely local unix socket with no network hop, and
 * uses the same socket name so the backend-generated nginx config (which
 * embeds the socket path) doesn't need to know which side actually hosts it.
 */
export class NjsControlHttpServer extends USHttpServer {

    /**
     * constructor
     * @param {string} nginxPrefix
     */
    public constructor(nginxPrefix: string) {
        // This internal unix-socket server must NOT run session middleware:
        // nginx auth_request subrequests carry no cookie. figtree's
        // BaseHttpServer already guards session setup behind
        // `if (serverInit.session)`, but its options type marks `session` as
        // required — hence the cast omitting it.
        super({
            realm: 'FlyingFish Nginx njs control',
            routes: [
                new AddressAccess(),
                new AuthBasic()
            ],
            socket: {
                mainPath: nginxPrefix,
                socketName: NGINX_CONTROL_UNIX_SOCKET_NAME
            }
        } as unknown as USHttpServerOptions);
    }

}