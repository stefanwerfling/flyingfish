import fs from 'fs';
import https from 'https';
import Path from 'path';
import {Logger} from '../Logger/Logger.js';
import {DefaultRoute} from './Routes/DefaultRoute.js';
import express, {Application, NextFunction, Request, Response} from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import {TlsClientError} from './TlsClientError.js';
import {TlsSocket} from './TlsSocket.js';

/**
 * BaseHttpServerOptionCrypt
 */
export type BaseHttpServerOptionCrypt = {
    sslPath: string;
    key: string;
    crt: string;
};

/**
 * BaseHttpServerOptionSession
 */
export type BaseHttpServerOptionSession = {
    max_age: number;
    ssl_path: string;
    cookie_path: string;
    secret: string;
};

/**
 * BaseHttpServerOptions
 */
export type BaseHttpServerOptions = {
    realm: string;
    port?: number;
    routes?: DefaultRoute[];
    session?: BaseHttpServerOptionSession;
    publicDir?: string;
    crypt?: BaseHttpServerOptionCrypt;
};

/**
 * BaseHttpServer
 */
export class BaseHttpServer {

    /**
     * List host address
     * @protected
     */
    protected static _listenHost: string = 'localhost';

    /**
     * server default port
     * @private
     */
    protected readonly _port: number = 3000;

    /**
     * server object
     * @private
     */
    protected readonly _server: Application;

    /**
     * realm
     * @private
     */
    protected readonly _realm: string;

    /**
     * session
     * @protected
     */
    protected readonly _session?: BaseHttpServerOptionSession;

    /**
     * use crypt
     * @private
     */
    protected readonly _crypt?: BaseHttpServerOptionCrypt;

    /**
     * Set the listen host
     * @param host
     */
    public static setListenHost(host: string): void {
        BaseHttpServer._listenHost = host;
    }

    /**
     * constructor
     * @param serverInit
     */
    public constructor(serverInit: BaseHttpServerOptions) {
        if (serverInit.port) {
            this._port = serverInit.port;
        }

        this._realm = serverInit.realm;

        if (serverInit.session) {
            this._session = serverInit.session;
        }

        this._server = express();
        this._server.use((req, _res, next) => {
            Logger.getLogger().silly('BaseHttpServer::request: Url: %s Protocol: %s Method: %s', req.url, req.protocol, req.method);
            next();
        });

        this._initServer();

        // -------------------------------------------------------------------------------------------------------------

        if (serverInit.routes) {
            this._routes(serverInit.routes);
        }

        if (serverInit.publicDir) {
            this._assets(serverInit.publicDir);
        }

        if (serverInit.crypt) {
            this._crypt = serverInit.crypt;
        }

        // add error handling
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        this._server.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
            response.status(500);
            Logger.getLogger().error(error.stack);
        });
    }

    /**
     * _initServer
     * @protected
     */
    protected _initServer(): void {
        this._server.use(bodyParser.urlencoded({extended: true}));
        this._server.use(bodyParser.json());
        this._server.use(cookieParser());

        // -------------------------------------------------------------------------------------------------------------

        if (this._session) {
            this._server.use(
                session({
                    secret: this._session.secret,
                    proxy: true,
                    resave: true,
                    saveUninitialized: true,
                    store: new session.MemoryStore(),
                    cookie: {
                        path: this._session.cookie_path,
                        secure: this._session.ssl_path !== '',
                        maxAge: this._session.max_age
                    }
                })
            );
        }
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
     * _checkKeyFile
     * @param keyFile
     * @protected
     */
    protected async _checkKeyFile(keyFile: string): Promise<boolean> {
        if (fs.existsSync(keyFile)) {
            Logger.getLogger().silly('BaseHttpServer::listen: express certs found in path: %s', this._crypt?.sslPath);

            return true;
        }

        return false;
    }

    /**
     * listen
     */
    public async listen(): Promise<void> {
        const app = this._server;

        if (this._crypt) {
            fs.mkdirSync(this._crypt.sslPath, {recursive: true});

            const keyFile = Path.join(this._crypt.sslPath, this._crypt.key);
            const crtFile = Path.join(this._crypt.sslPath, this._crypt.crt);

            if (await this._checkKeyFile(keyFile)) {
                const privateKey = fs.readFileSync(keyFile);
                const crt = fs.readFileSync(crtFile);

                const httpsServer = https.createServer({
                    key: privateKey,
                    cert: crt
                }, app);

                httpsServer.on('tlsClientError', (err, atlsSocket) => {
                    const tlsError = err as TlsClientError;

                    if (tlsError.reason === 'http request') {
                        const tTlsSocket = atlsSocket as TlsSocket;

                        if (tTlsSocket._parent) {
                            tTlsSocket._parent.write('HTTP/1.1 302 Found\n' +
                                `Location: https://${BaseHttpServer._listenHost}:${this._port}`);
                        }

                        Logger.getLogger().error(
                            'The client call the Server over HTTP protocol. Please use HTTPS, example: https://%s:%d',
                            BaseHttpServer._listenHost,
                            this._port,
                            {
                                class: 'BaseHttpServer::listen'
                            }
                        );
                    }
                });

                httpsServer.listen(this._port, () => {
                    Logger.getLogger().info(
                        '%s listening on the https://%s:%d',
                        this._realm,
                        BaseHttpServer._listenHost,
                        this._port,
                        {
                            class: 'BaseHttpServer::listen'
                        }
                    );
                });
            } else {
                Logger.getLogger().error('BaseHttpServer::listen: Key and Certificate not found for http server!');
            }
        } else {
            app.listen(this._port, () => {
                Logger.getLogger().info(
                    'BaseHttpServer::listen: %s listening on the http://%s:%d',
                    this._realm,
                    BaseHttpServer._listenHost,
                    this._port
                );
            });
        }
    }

}