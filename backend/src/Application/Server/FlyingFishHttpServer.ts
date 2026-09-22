import {HttpServer} from '@stefanwerfling/figtree';
import {Request} from 'express';
import {isServiceAuthenticated} from './FlyingFishRouteCheckServiceOrUserLogin.js';

/**
 * FlyingFishHttpServer
 *
 * figtree `HttpServer` using its default in-memory express session store. The
 * former Redis-backed store was removed together with the rest of the Redis
 * dependency (all inter-service IPC moved to HTTP); sessions live in-process.
 */
export class FlyingFishHttpServer extends HttpServer {

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