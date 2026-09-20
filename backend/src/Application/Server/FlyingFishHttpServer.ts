import RedisStore from 'connect-redis';
import {HttpServer, RedisClient} from '@stefanwerfling/figtree';
import {Request} from 'express';
import {Store} from 'express-session';
import {isServiceAuthenticated} from './FlyingFishRouteCheckServiceOrUserLogin.js';

/**
 * FlyingFishHttpServer
 *
 * figtree `HttpServer` with a Redis-backed express session store, so sessions
 * survive restarts and can be shared across instances (restores the former
 * `main.ts` connect-redis wiring). Falls back to figtree's default in-memory
 * store when Redis is not configured/connected.
 *
 * The main `RedisClient` singleton is safe to share here: `RedisDBService`
 * subscribes HimHIP on a SEPARATE `RedisSubscribe` connection, so the main
 * client can still issue the regular GET/SET commands the session store needs.
 */
export class FlyingFishHttpServer extends HttpServer {

    /**
     * Return the session store: Redis when available, else the default memory
     * store.
     * @return {Store}
     * @protected
     */
    protected override _getSessionStore(): Store {
        if (RedisClient.hasInstance() && RedisClient.getInstance().isConnected()) {
            return new RedisStore({
                client: RedisClient.getInstance().getClient(),
                prefix: 'ff:sess:'
            });
        }

        return super._getSessionStore();
    }

    /**
     * FlyingFish's Content-Security-Policy. Restores the policy the backend
     * shipped before the figtree migration (which the old inc/Server/HttpServer
     * carried): `script-src 'self'` only (no unsafe-inline) and `font-src`
     * allowing `data:` URIs. figtree's default is more permissive on scripts and
     * drops `data:` fonts, so it is overridden here.
     * @return {Record<string, string[]>}
     * @protected
     */
    protected override _getCspDirectives(): Record<string, string[]> {
        return {
            defaultSrc: ['\'self\''],
            connectSrc: ['\'self\''],
            frameSrc: ['\'self\''],
            childSrc: ['\'self\''],
            scriptSrc: ['\'self\''],
            styleSrc: ['\'self\'', '\'unsafe-inline\''],
            fontSrc: ['\'self\'', 'data:'],
            imgSrc: ['\'self\'', 'https: data:'],
            baseUri: ['\'self\'']
        };
    }

    /**
     * Skip the `/json/` rate limiter for trusted FlyingFish parts in addition to
     * logged-in users. Parts (netdevice, nginxserver, dns, …) poll the config
     * endpoints on a reconcile loop and self-register with the Hub; on a host-net
     * node they all reach the backend through Docker's port-forward SNAT, so they
     * share ONE bridge-gateway source IP. figtree's default 100-requests / 15-min
     * per-IP budget throttles that shared traffic into 429s, which turns a single
     * part restart into a self-sustaining crash-loop (register → 429 → exit →
     * restart → re-arm the block). A part authenticating by mTLS or the registry
     * secret is a trusted internal caller, not an anonymous browser, so it is
     * exempt from the limiter.
     * @param {Request} request
     * @return {Promise<boolean>}
     * @protected
     */
    protected override async _limiterSkip(request: Request): Promise<boolean> {
        if (await super._limiterSkip(request)) {
            return true;
        }

        return isServiceAuthenticated(request);
    }

}