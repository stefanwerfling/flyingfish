import session from 'express-session';
import * as http from 'http';
import express from 'express';
import {v4 as uuid} from 'uuid';
// import {DefaultRoute} from '../Routes/DefaultRoute.js';

/**
 * HTTP Server
 */
export class HttpServer {

    /**
     * app server object
     * @private
     */
    private readonly _appServer: express.Application;

    /**
     * server
     * @private
     */
    private readonly _server: http.Server;

    /**
     * session parser
     * @private
     */
    private readonly _sessionParser: express.RequestHandler;

    /**
     * server default port
     * @private
     */
    private readonly _port: number = 3004;

    /**
     * constructor
     * @param appInit
     */
    public constructor(appInit: {
        port?: number;
        secret?: string;
        routes: any[];
    }) {
        let secret = uuid();

        if (appInit.port) {
            this._port = appInit.port;
        }

        if (appInit.secret) {
            secret = appInit.secret;
        }

        this._appServer = express();
        this._sessionParser = session({
            saveUninitialized: false,
            secret: secret,
            resave: false
        });

        this._appServer.use(this._sessionParser);

        // -------------------------------------------------------------------------------------------------------------

        if (appInit.routes) {
            this._routes(appInit.routes);
        }

        // -------------------------------------------------------------------------------------------------------------

        this._server = http.createServer(this._appServer);
    }

    /**
     * _routes
     * @param routes
     * @private
     */
    private _routes(routes: any[]): void {
        routes.forEach((route) => {
            this._appServer.use(route.getExpressRouter());
        });
    }

}