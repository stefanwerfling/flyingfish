import express, {Application} from 'express';
import session from 'express-session';
import * as http from 'http';
import {v4 as uuid} from 'uuid';
import WebSocket, {WebSocketServer} from 'ws';

/**
 * Server
 */
export class VpnServer {

    /**
     * app server object
     * @private
     */
    private readonly _appServer: Application;

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
     * web socket server
     * @private
     */
    private readonly _wsServer: WebSocketServer;

    /**
     * constructor
     * @param appInit
     */
    public constructor(appInit: {
        port?: number;
        secret?: string;
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
        this._server = http.createServer(this._appServer);
        this._wsServer = new WebSocketServer({
            clientTracking: false,
            noServer: true
        });
    }

    /**
     * start server listen
     */
    public async listen(): Promise<void> {
        this._server.listen(this._port, () => {
            console.log(`Listening on http://localhost:${this._port}`);
        });
    }

}