import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express, {Application, NextFunction, Request, Response} from 'express';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import fs from 'fs';
import helmet from 'helmet';
import * as https from 'https';
import Path from 'path';
import {Logger} from '../Logger/Logger.js';
import {DefaultRoute} from '../Routes/DefaultRoute.js';
import {FlyingFishSsl} from '../Utils/FlyingFishSsl.js';
import {Session} from './Session.js';

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
        sslPath: string;
        routes: DefaultRoute[];
        port: number;
        session: {
            max_age: number;
            ssl_path: string;
            cookie_path: string;
            secret: string;
        };
        publicDir: string;
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
                }

                return 0;
            }
        });

        this._server.use(limiter);
        this._server.use(bodyParser.urlencoded({extended: true}));
        this._server.use(bodyParser.json());
        this._server.use(cookieParser());

        // -------------------------------------------------------------------------------------------------------------

        this._server.use(
            session({
                secret: appInit.session.secret,
                proxy: true,
                resave: true,
                saveUninitialized: true,
                store: new session.MemoryStore(),
                cookie: {
                    path: appInit.session.cookie_path,
                    secure: appInit.session.ssl_path !== '',
                    maxAge: appInit.session.max_age
                }
            })
        );

        // -------------------------------------------------------------------------------------------------------------

        if (appInit.routes) {
            this._routes(appInit.routes);
        }

        if (appInit.publicDir) {
            this._assets(appInit.publicDir);
        }

        if (appInit.sslPath) {
            this._sslPath = appInit.sslPath;
        }

        // add error handling
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        this._server.use((error: Error, request: Request, response: Response, _next: NextFunction) => {
            response.status(500);
            Logger.getLogger().error(error.stack);
        });
    }

    /**
     * _routes
     * @param routes
     * @private
     */
    private _routes(routes: DefaultRoute[]): void {
        routes.forEach((route) => {
            this._server.use(route.getExpressRouter());
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

            if (fs.existsSync(keyFile)) {
                Logger.getLogger().silly(`Server::listen: express certs found in path: ${this._sslPath}`);
            } else {
                Logger.getLogger().silly(`Server::listen: create certs for express by path: ${this._sslPath}`);

                await FlyingFishSsl.createExpressCerts(this._sslPath);
            }

            const privateKey = fs.readFileSync(keyFile);
            const crt = fs.readFileSync(crtFile);

            https.createServer({
                key: privateKey,
                cert: crt
            }, app).listen(this._port, () => {
                Logger.getLogger().info(`Server::listen: Flingfish listening on the https://localhost:${this._port}`);
            });
        } else {
            app.listen(this._port, () => {
                Logger.getLogger().info(`Server::listen: Flingfish listening on the http://localhost:${this._port}`);
            });
        }
    }

}