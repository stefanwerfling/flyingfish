import RedisStore from 'connect-redis';
import {HttpServer, RedisClient} from 'figtree';
import {Store} from 'express-session';

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

}