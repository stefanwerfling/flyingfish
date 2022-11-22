import express, {Application} from 'express';
import fs from 'fs';
import helmet from 'helmet';
import * as https from 'https';
import Path from 'path';
import {useExpressServer} from 'routing-controllers-extended';
import {Logger} from '../Logger/Logger.js';
import {FlyingFishSsl} from '../Utils/FlyingFishSsl.js';

/**
 * Server
 */
export class Server {

    /**
     * server object
     * @private
     */
    private readonly _server: Application;

    /**
     * _sslPath
     * @private
     */
    private readonly _sslPath?: string;

    /**
     * server default port
     * @private
     */
    private readonly _port: number = 3000;

    /**
     * constructor
     * @param appInit
     */
    public constructor(appInit: {
        port?: number;
        middleWares?: any;
        routes?: any;
        controllers?: any;
        publicDir?: string | null;
        sslPath?: string;
    }) {
        if (appInit.port) {
            this._port = appInit.port;
        }

        this._server = express();
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

        if (appInit.middleWares) {
            this._middlewares(appInit.middleWares);
        }

        if (appInit.routes) {
            this._routes(appInit.routes);
        }

        if (appInit.controllers) {
            useExpressServer(this._server, {
                controllers: appInit.controllers
            });
        }

        if (appInit.publicDir) {
            this._assets(appInit.publicDir);
        }

        if (appInit.sslPath) {
            this._sslPath = appInit.sslPath;
        }
    }

    /**
     * _middlewares
     * @param middleWares
     * @private
     */
    private _middlewares(middleWares: { forEach: (arg0: (middleWare: any) => void) => void; }): void {
        middleWares.forEach((middleWare) => {
            this._server.use(middleWare);
        });
    }

    /**
     * _routes
     * @param routes
     * @private
     */
    private _routes(routes: { forEach: (arg0: (route: any) => void) => void; }): void {
        routes.forEach((route) => {
            this._server.use('/', route.router);
        });
    }

    /**
     * _assets
     * @param publicDir
     * @private
     */
    private _assets(publicDir: string | null): void {
        if (publicDir !== null) {
            this._server.use(express.static(publicDir));
        }
    }

    /**
     * start server listen
     */
    public async listen(): Promise<void> {
        const app = this._server;

        if (this._sslPath) {
            fs.mkdirSync(this._sslPath, {recursive: true});

            const keyFile = Path.join(this._sslPath, FlyingFishSsl.FILE_KEYPEM);
            const crtFile = Path.join(this._sslPath, FlyingFishSsl.FILE_CRT);

            if (!fs.existsSync(keyFile)) {
                await FlyingFishSsl.createExpressCerts(this._sslPath);
            }

            const privateKey = fs.readFileSync(keyFile);
            const crt = fs.readFileSync(crtFile);

            https.createServer({
                key: privateKey,
                cert: crt
            }, app).listen(this._port, () => {
                Logger.getLogger().info(`Flingfish listening on the https://localhost:${this._port}`);
            });
        } else {
            app.listen(this._port, () => {
                Logger.getLogger().info(`Flingfish listening on the http://localhost:${this._port}`);
            });
        }
    }

}