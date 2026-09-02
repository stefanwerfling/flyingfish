import {BaseHttpServer, BaseHttpServerOptions} from 'figtree';
import {DefaultRoute} from 'flyingfish_core';

/**
 * ControlHttpServer
 *
 * Minimal figtree HTTP server hosting the nginx control-agent routes. It is an
 * internal service-to-service API (backend -> agent, authed by the shared nginx
 * secret) with no user sessions.
 */
export class ControlHttpServer extends BaseHttpServer {

    /**
     * constructor
     * @param {number} port
     * @param {DefaultRoute[]} routes
     */
    public constructor(port: number, routes: DefaultRoute[]) {
        // This internal control API has no user sessions: figtree's BaseHttpServer
        // already guards session middleware behind `if (serverInit.session)`, but
        // its options type marks `session` as required — hence the cast omitting
        // it. (figtree should make `BaseHttpServerOptions.session` optional.)
        super({
            realm: 'FlyingFish Nginx control',
            port: port,
            routes: routes
        } as unknown as BaseHttpServerOptions);
    }

}