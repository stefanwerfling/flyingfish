import rateLimit from 'express-rate-limit';
import {BaseHttpServer} from 'figtree';
import helmet from 'helmet';

/**
 * HttpServer
 */
export class HttpServer extends BaseHttpServer {

    /**
     * _initExpressUsePre
     * Add FlyingFish's security middleware after figtree's body/cookie/session
     * middleware and before the routes: helmet with a strict CSP and a rate
     * limiter guarding the DDNS update endpoints. figtree's own `HttpServer`
     * limiter only covers `/json/` and is skipped for logged-in users, so it
     * does not fit this service — the limiter is wired up here.
     * @protected
     */
    protected override _initExpressUsePre(): void {
        super._initExpressUsePre();

        if (this._express === undefined) {
            throw new Error('Express isnt init!');
        }

        this._express.use(helmet());
        this._express.use(helmet.contentSecurityPolicy({
            directives: {
                defaultSrc: ['\'self\''],
                connectSrc: ['\'self\''],
                frameSrc: ['\'self\''],
                childSrc: ['\'self\''],
                scriptSrc: [
                    '\'self\''
                ],
                styleSrc: [
                    '\'self\'',
                    '\'unsafe-inline\''
                ],
                fontSrc: [
                    '\'self\'',
                    'data:'
                ],
                imgSrc: ['\'self\'', 'https: data:'],
                baseUri: ['\'self\'']
            }
        }));

        // The rate limit applies even with Basic Auth: it protects the DDNS update
        // endpoints against credential brute-force. 100 requests / 15 min per IP is
        // generous for legitimate DynDNS clients (which only update on IP change).
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            standardHeaders: true,
            legacyHeaders: false,
            limit: 100
        });

        this._express.use(limiter);
    }

}