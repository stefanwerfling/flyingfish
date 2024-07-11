import express, {Application} from 'express';
import session from 'express-session';
import * as http from 'http';
import {v4 as uuid} from 'uuid';
import {WebSocketServer} from 'ws';

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

        this._appServer.post('/login', (request, response) => {
            const id = uuid();

            // @ts-ignore
            request.session.userId = id;
            response.send({
                result: 'OK',
                message: 'Session updated'
            });
        });

        this._server = http.createServer(this._appServer);
        this._wsServer = new WebSocketServer({
            clientTracking: false,
            noServer: true
        });

        const sessionParser = this._sessionParser;
        const wss = this._wsServer;
        const map = new Map();

        this._server.on('upgrade', (request, socket, head) => {
            socket.on('error', (err) => {
                console.error(err);
            });

            console.log('Parsing session from request...');

            sessionParser(
                // @ts-ignore
                request,
                {},
                () => {
                    // @ts-ignore
                    if (!request.session.userId) {
                        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                        socket.destroy();
                        return;
                    }

                    console.log('Session is parsed!');

                    socket.removeListener('error', (err) => {
                        console.error(err);
                    });

                    wss.handleUpgrade(request, socket, head, (ws) => {
                        wss.emit('connection', ws, request);
                    });
                }
            );
        });

        wss.on('connection', (ws, request) => {
            // @ts-ignore
            const userId = request.session.userId;

            map.set(userId, ws);

            ws.on('error', console.error);

            ws.on('message', (message) => {
                console.log(`Received message ${message} from user ${userId}`);
            });

            ws.on('close', () => {
                map.delete(userId);
            });
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