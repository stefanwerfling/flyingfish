import {BaseHttpServerOptions, HttpServer, HttpService} from 'figtree';
import {FlyingFishHttpServer} from './FlyingFishHttpServer.js';
import {PkiTrust} from '../Hub/PkiTrust.js';

/**
 * FlyingFishHttpService
 *
 * figtree `HttpService` that builds a `FlyingFishHttpServer` (Redis-backed
 * session store) via the `_createServer` factory seam, instead of the plain
 * figtree `HttpServer`.
 *
 * It keeps figtree's HttpService default importance (Important), so the admin
 * HTTP server is health-checked and restarted by the service monitor. start() is
 * made restart-safe for that restart path.
 */
export class FlyingFishHttpService extends HttpService {

    /**
     * Create the FlyingFish HTTP server instance.
     * @param {BaseHttpServerOptions} options
     * @return {HttpServer}
     * @protected
     */
    protected override _createServer(options: BaseHttpServerOptions): HttpServer {
        // Node PKI (v2, mTLS): when the Hub trust holds a CA chain (fetched from
        // the pkiserver at boot), seed it as the client CA so the HTTPS server
        // requests + verifies part client certificates. rejectUnauthorized stays
        // false (optional mTLS) — the registry guard decides based on the captured
        // peer certificate, and the admin UI keeps working without a client cert.
        const trust = PkiTrust.get();

        if (trust !== null && trust.getCaChain().length > 0) {
            options.mtls = {
                ca: trust.getCaChain(),
                rejectUnauthorized: false
            };
        }

        return new FlyingFishHttpServer(options);
    }

    /**
     * Close a still-open server so start() can re-bind the port on a restart.
     * @protected
     */
    protected _releaseServer(): void {
        const server = this.getServer();

        if (server !== null) {
            server.close();
        }
    }

    /**
     * Start the HTTP server.
     *
     * Restart-safe: the service monitor re-invokes start() on an unhealthy
     * service WITHOUT a prior stop(), so release any still-open server before the
     * base recreates and re-listens (no-op on the initial start).
     */
    public override async start(): Promise<void> {
        this._releaseServer();
        await super.start();
    }

    /**
     * Health check for the service monitor: healthy while the underlying HTTP
     * server is actually listening.
     * @returns {Promise<boolean>}
     */
    public override async healthCheck(): Promise<boolean> {
        const server = this.getServer();

        return server !== null && server.getServer()?.listening === true;
    }

}