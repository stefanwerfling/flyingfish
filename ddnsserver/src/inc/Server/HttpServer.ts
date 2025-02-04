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

        this._server.use(helmet());
        this._server.use(helmet.contentSecurityPolicy({
            directives: {
                defaultSrc: ['\'self\''],
                connectSrc: ['\'self\''],
                frameSrc: ['\'self\''],
                childSrc: ['\'self\''],
                scriptSrc: [
                    '\'self\'',
                    '*',
                    '\'unsafe-inline\''
                ],
                styleSrc: [
                    '\'self\'',
                    '*',
                    '\'unsafe-inline\''
                ],
                fontSrc: [
                    '\'self\'',
                    '*',
                    '\'unsafe-inline\''
                ],
                imgSrc: ['\'self\'', 'https: data:'],
                baseUri: ['\'self\'']
            }
        }));

        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            standardHeaders: true,
            legacyHeaders: false,
            skip: async() => { return true; },
            limit: async() => { return Number.MAX_SAFE_INTEGER; }
        });

        this._server.use(limiter);
    }

}