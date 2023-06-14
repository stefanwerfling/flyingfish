import rateLimit from 'express-rate-limit';
import {BaseHttpServer, FileHelper, Logger, Session} from 'flyingfish_core';
import helmet from 'helmet';
import {Config} from '../Config/Config.js';
import {FlyingFishSsl} from '../Utils/FlyingFishSsl.js';

// we need for declare Express Request Session
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import session from 'express-session';

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
            max: async(request) => {
                if (request.baseUrl.indexOf('/json/') === 0) {
                    if (Session.isUserLogin(request.session)) {
                        return 0;
                    }

                    return 100;
                } else if (request.baseUrl.indexOf('/njs/') === 0) {
                    const secret = request.header('secret') ?? '';
                    const ssecret = Config.getInstance().get()!.nginx!.secret ?? '';

                    if (secret === ssecret) {
                        return 0;
                    }

                    return -1;
                } else if (request.baseUrl.indexOf('/himhip/') === 0) {
                    const secret = request.header('secret') ?? '';
                    const ssecret = Config.getInstance().get()!.himhip!.secret ?? '';

                    if (secret === ssecret) {
                        return 0;
                    }

                    return -1;
                }

                return 0;
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
            Logger.getLogger().silly(`HttpServer::listen: express certs found in path: ${this._crypt?.sslPath}`);
        } else {
            Logger.getLogger().silly(`HttpServer::listen: create certs for express by path: ${this._crypt?.sslPath}`);

            await FlyingFishSsl.createExpressCerts(this._crypt?.sslPath!);
        }

        return true;
    }

}