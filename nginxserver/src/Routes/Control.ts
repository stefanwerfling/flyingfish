import {Request, Response, Router} from 'express';
import {DefaultRoute, ServiceAuth} from 'flyingfish_core';
import {NginxProcessAgent} from '../inc/Nginx/NginxProcessAgent.js';

/**
 * Header carrying the shared nginx control secret (ServiceAuth).
 */
export const NGINX_CONTROL_SECRET_HEADER = 'x-flyingfish-nginx-secret';

/**
 * Control
 *
 * The nginx control agent's routes: the backend calls these (over the private
 * network, authed with the shared nginx secret) to reload/test/start/stop the
 * nginx process that runs in this container, and to query its status. The
 * config itself arrives via the shared volume; these endpoints only drive the
 * process.
 */
export class Control extends DefaultRoute {

    /**
     * The local nginx process controller.
     * @protected
     */
    protected _agent: NginxProcessAgent;

    /**
     * The expected shared secret (empty -> every call is rejected).
     * @protected
     */
    protected _secret: string;

    /**
     * constructor
     * @param {NginxProcessAgent} agent
     * @param {string} secret
     */
    public constructor(agent: NginxProcessAgent, secret: string) {
        super();

        this._agent = agent;
        this._secret = secret;
    }

    /**
     * Verify the request's shared secret; sends 401 and returns false if invalid.
     * @param {Request} req
     * @param {Response} res
     * @returns {boolean}
     * @protected
     */
    protected _isAuthed(req: Request, res: Response): boolean {
        const provided = req.header(NGINX_CONTROL_SECRET_HEADER) ?? '';

        if (!ServiceAuth.verifySecret(provided, this._secret)) {
            res.sendStatus(401);
            return false;
        }

        return true;
    }

    /**
     * getExpressRouter
     * @returns {Router}
     */
    public getExpressRouter(): Router {
        this._post('/nginx/reload', (req: Request, res: Response): void => {
            if (!this._isAuthed(req, res)) {
                return;
            }

            this._agent.reload();
            res.sendStatus(200);
        });

        this._post('/nginx/start', (req: Request, res: Response): void => {
            if (!this._isAuthed(req, res)) {
                return;
            }

            this._agent.start();
            res.sendStatus(200);
        });

        this._post('/nginx/stop', (req: Request, res: Response): void => {
            if (!this._isAuthed(req, res)) {
                return;
            }

            this._agent.stop();
            res.sendStatus(200);
        });

        this._post('/nginx/test', async(req: Request, res: Response): Promise<void> => {
            if (!this._isAuthed(req, res)) {
                return;
            }

            const ok = await this._agent.testConfig();
            res.status(ok ? 200 : 500).json({ok: ok});
        });

        this._get('/nginx/status', (req: Request, res: Response): void => {
            if (!this._isAuthed(req, res)) {
                return;
            }

            res.status(200).json({running: this._agent.isRun()});
        });

        return super.getExpressRouter();
    }

}