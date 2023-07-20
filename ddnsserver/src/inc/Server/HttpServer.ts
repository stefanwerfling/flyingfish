import rateLimit from 'express-rate-limit';
import {BaseHttpServer, FileHelper, Logger} from 'flyingfish_core';
import helmet from 'helmet';

// we need for declare Express Request Session
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import session from 'express-session';

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
            max: async(request) => {
                if (request.baseUrl.indexOf('/') === 0) {
                    return 100;
                }

                return 0;
            }
        });

        this._server.use(limiter);
    }

}