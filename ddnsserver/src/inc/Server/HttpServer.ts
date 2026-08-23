import rateLimit from 'express-rate-limit';
import {BaseHttpServer} from 'flyingfish_core';
import helmet from 'helmet';

/**
 * HttpServer
 */
export class HttpServer extends BaseHttpServer {

    /**
     * _initServer
     * @protected
     */
    protected _initServer(): void {
        super._initServer();

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