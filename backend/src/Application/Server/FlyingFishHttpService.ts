import {BaseHttpServerOptions, HttpServer, HttpService} from 'figtree';
import {FlyingFishHttpServer} from './FlyingFishHttpServer.js';

/**
 * FlyingFishHttpService
 *
 * figtree `HttpService` that builds a `FlyingFishHttpServer` (Redis-backed
 * session store) via the `_createServer` factory seam, instead of the plain
 * figtree `HttpServer`.
 */
export class FlyingFishHttpService extends HttpService {

    /**
     * Create the FlyingFish HTTP server instance.
     * @param {BaseHttpServerOptions} options
     * @return {HttpServer}
     * @protected
     */
    protected override _createServer(options: BaseHttpServerOptions): HttpServer {
        return new FlyingFishHttpServer(options);
    }

}