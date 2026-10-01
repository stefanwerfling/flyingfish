import {HttpServer} from '@stefanwerfling/figtree';
import {Request, Response} from 'express';
import {IncomingMessage} from 'http';
import {Duplex} from 'stream';
import {WebSocket, WebSocketServer} from 'ws';
import {LogRecord} from 'flyingfish_schemas';
import {isServiceAuthenticated} from './FlyingFishRouteCheckServiceOrUserLogin.js';
import {LogStreamHub} from '../../inc/Log/LogStreamHub.js';

/**
 * FlyingFishHttpServer
 *
 * figtree `HttpServer` using its default in-memory express session store. The
 * former Redis-backed store was removed together with the rest of the Redis
 * dependency (all inter-service IPC moved to HTTP); sessions live in-process.
 */
export class FlyingFishHttpServer extends HttpServer {

    /**
     * FlyingFish's Content-Security-Policy. Restores the policy the backend
     * shipped before the figtree migration (which the old inc/Server/HttpServer
     * carried): `script-src 'self'` only (no unsafe-inline) and `font-src`
     * allowing `data:` URIs. figtree's default is more permissive on scripts and
     * drops `data:` fonts, so it is overridden here.
     * @return {Record<string, string[]>}
     * @protected
     */
    protected override _getCspDirectives(): Record<string, string[]> {
        return {
            defaultSrc: ['\'self\''],
            connectSrc: ['\'self\''],
            frameSrc: ['\'self\''],
            childSrc: ['\'self\''],
            scriptSrc: ['\'self\''],
            styleSrc: ['\'self\'', '\'unsafe-inline\''],
            fontSrc: ['\'self\'', 'data:'],
            imgSrc: ['\'self\'', 'https: data:'],
            baseUri: ['\'self\'']
        };
    }

    /**
     * Skip the `/json/` rate limiter for trusted FlyingFish parts in addition to
     * logged-in users. Parts (netdevice, nginxserver, dns, …) poll the config
     * endpoints on a reconcile loop and self-register with the Hub; on a host-net
     * node they all reach the backend through Docker's port-forward SNAT, so they
     * share ONE bridge-gateway source IP. figtree's default 100-requests / 15-min
     * per-IP budget throttles that shared traffic into 429s, which turns a single
     * part restart into a self-sustaining crash-loop (register → 429 → exit →
     * restart → re-arm the block). A part authenticating by mTLS or the registry
     * secret is a trusted internal caller, not an anonymous browser, so it is
     * exempt from the limiter.
     * @param {Request} request
     * @return {Promise<boolean>}
     * @protected
     */
    protected override async _limiterSkip(request: Request): Promise<boolean> {
        if (await super._limiterSkip(request)) {
            return true;
        }

        return isServiceAuthenticated(request);
    }

    /**
     * The live-log WebSocket server (Log-Center P3), attached to the HTTP server's upgrade
     * path `/ws/logs`.
     * @protected
     */
    protected _logWss: WebSocketServer | null = null;

    /**
     * Start listening, then attach the live-log WebSocket endpoint to the freshly-created
     * HTTP server (a restart recreates the server, so this re-attaches each listen).
     */
    public override async listen(): Promise<void> {
        await super.listen();
        this._attachLogWebSocket();
    }

    /**
     * Attach the live-log WebSocket server at `/ws/logs`. Authenticates the upgrade via the
     * express session cookie (same logged-in-user check as the JSON routes), then subscribes
     * the socket to {@link LogStreamHub}. Per-socket back-pressure guard: records are dropped
     * (never buffered unbounded) when the client can't keep up, so a slow viewer under heavy
     * log volume can never grow the server's memory.
     * @protected
     */
    protected _attachLogWebSocket(): void {
        const server = this._server;
        const sessionParser = this._sessionParser;

        if (server === null || sessionParser === null) {
            return;
        }

        const wss = new WebSocketServer({noServer: true});
        this._logWss = wss;

        server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer): void => {
            if (req.url === undefined || !req.url.startsWith('/ws/logs')) {
                socket.destroy();

                return;
            }

            // Authenticate the upgrade by parsing the session from the request cookies.
            sessionParser(req as unknown as Request, {} as Response, (): void => {
                const session = (req as unknown as {session?: {user?: {isLogin?: boolean;};};}).session;

                if (session?.user?.isLogin !== true) {
                    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                    socket.destroy();

                    return;
                }

                wss.handleUpgrade(req, socket, head, (ws: WebSocket): void => {
                    FlyingFishHttpServer._onLogSocket(ws, req);
                });
            });
        });
    }

    /**
     * Wire one accepted live-log socket: apply its URL filters (areas/levels/text) and stream
     * matching records from {@link LogStreamHub} until it closes.
     * @param ws - the accepted WebSocket
     * @param req - the upgrade request (carries the filter query string)
     * @protected
     */
    protected static _onLogSocket(ws: WebSocket, req: IncomingMessage): void {
        const url = new URL(req.url ?? '', 'http://localhost');
        const areas = (url.searchParams.get('areas') ?? '').split(',').filter((entry) => entry !== '');
        const levels = (url.searchParams.get('levels') ?? '').split(',').filter((entry) => entry !== '');
        const text = (url.searchParams.get('text') ?? '').toLowerCase();

        // Drop (never buffer) once the client is ~1 MB behind — the back-pressure guard.
        const maxBuffer = 1024 * 1024;

        const subscriber = (record: LogRecord): void => {
            if (ws.readyState !== WebSocket.OPEN) {
                return;
            }

            if (areas.length > 0 && !areas.includes(record.area)) {
                return;
            }

            if (levels.length > 0 && !levels.includes(record.level)) {
                return;
            }

            if (text !== '' && !record.message.toLowerCase().includes(text)) {
                return;
            }

            if (ws.bufferedAmount > maxBuffer) {
                return;
            }

            try {
                ws.send(JSON.stringify(record));
            } catch {
                // ignore a failed send; the close handler will clean up
            }
        };

        if (!LogStreamHub.getInstance().subscribe(subscriber)) {
            ws.close(1013, 'too many live log subscribers');

            return;
        }

        const keepAlive = setInterval((): void => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.ping();
                } catch {
                    // ignore
                }
            }
        }, 30000);
        keepAlive.unref();

        const cleanup = (): void => {
            clearInterval(keepAlive);
            LogStreamHub.getInstance().unsubscribe(subscriber);
        };

        ws.on('close', cleanup);
        ws.on('error', cleanup);
    }

}