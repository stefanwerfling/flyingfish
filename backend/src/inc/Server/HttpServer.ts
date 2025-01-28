import rateLimit from 'express-rate-limit';
import {BaseHttpServer, FileHelper, Logger, Session} from 'flyingfish_core';
import {SchemaRequestData} from 'flyingfish_schemas';
import helmet from 'helmet';
import {Config} from '../Config/Config.js';
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
            skip: async(request) => {
                if (request.url.indexOf('/json/') === 0) {
                    if (SchemaRequestData.validate(request, []) && Session.isUserLogin(request.session)) {
                        return true;
                    }
                } else if (request.url.indexOf('/himhip/') === 0) {
                    const secret = request.header('secret') ?? '';
                    const ssecret = Config.getInstance().get()!.himhip!.secret ?? '';

                    if (secret === ssecret) {
                        return true;
                    }
                }

                return false;
            },
            limit: async(request) => {
                if (request.url.indexOf('/json/') === 0) {
                    return 100;
                } else if (request.url.indexOf('/himhip/') === 0) {
                    return Number.MAX_SAFE_INTEGER;
                }

                // File access for html/js/img etc. allow ever.
                return Number.MAX_SAFE_INTEGER;
            }
        });

        this._server.use(limiter);
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