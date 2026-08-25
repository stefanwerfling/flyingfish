import rateLimit from 'express-rate-limit';
import {BaseHttpServer, Session} from 'flyingfish_core';
import {FileHelper, Logger} from 'figtree';
import {SchemaRequestData} from 'flyingfish_schemas';
import helmet from 'helmet';
import {FlyingFishSsl} from '../Utils/FlyingFishSsl.js';

/**
 * Server
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

        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            legacyHeaders: false,
            standardHeaders: 'draft-8',
            skip: async(request) => {
                if (request.url.indexOf('/json/') === 0) {
                    if (SchemaRequestData.validate(request, []) && Session.isUserLogin(request.session)) {
                        return true;
                    }
                }

                return false;
            },
            limit: async(request) => {
                if (request.url.indexOf('/json/') === 0) {
                    return 100;
                }

                // File access for html/js/img etc. allow ever.
                return Number.MAX_SAFE_INTEGER;
            },
            handler: (req, res) => {
                Logger.getLogger().warn('Too Many Requests: %s is blocked for %s.', req.ip, req.url);

                res.status(429).json({ message: 'Too Many Requests' });
            }
        });

        this._express.use(limiter);
    }

    /**
     * _checkKeyFile
     * @param keyFile
     * @protected
     */
    protected async _checkKeyFile(keyFile: string): Promise<boolean> {
        if (await FileHelper.fileExist(keyFile)) {
            Logger.getLogger().silly('HttpServer::listen: express certs found in path: %s', this._crypt?.sslPath);
        } else {
            Logger.getLogger().silly('HttpServer::listen: create certs for express by path: %s', this._crypt?.sslPath);

            await FlyingFishSsl.createExpressCerts(this._crypt?.sslPath!);
        }

        return true;
    }

}