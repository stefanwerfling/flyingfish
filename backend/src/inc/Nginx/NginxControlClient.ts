import {Logger} from 'figtree';

/**
 * Header carrying the shared nginx control secret. Must match the nginx control
 * agent's `NGINX_CONTROL_SECRET_HEADER` (nginxserver/src/Routes/Control.ts).
 */
const NGINX_CONTROL_SECRET_HEADER = 'x-flyingfish-nginx-secret';

/**
 * NginxControlClient
 *
 * Client the backend uses to drive nginx when it runs in its own container
 * (9.2.2): it calls the control agent's HTTP API (authed with the shared nginx
 * secret) to start/stop/reload/test the remote nginx process and to query its
 * status. The config itself is delivered separately via the shared volume.
 */
export class NginxControlClient {

    /**
     * base URL of the nginx control agent
     * @protected
     */
    protected _url: string;

    /**
     * shared secret for ServiceAuth
     * @protected
     */
    protected _secret: string;

    /**
     * constructor
     * @param {string} url
     * @param {string} secret
     */
    public constructor(url: string, secret: string) {
        this._url = url.replace(/\/+$/u, '');
        this._secret = secret;
    }

    /**
     * Issue a request to the agent, throwing on a network error or non-2xx.
     * @param {string} path
     * @param {'GET' | 'POST'} method
     * @returns {Promise<Response>}
     * @protected
     */
    protected async _request(path: string, method: 'GET' | 'POST'): Promise<Response> {
        const response = await fetch(`${this._url}${path}`, {
            method: method,
            headers: {
                [NGINX_CONTROL_SECRET_HEADER]: this._secret
            }
        });

        if (!response.ok) {
            throw new Error(`nginx control agent returned ${response.status} for ${method} ${path}`);
        }

        return response;
    }

    /**
     * Reload the remote nginx (re-reads the config from the shared volume).
     * @returns {Promise<void>}
     */
    public async reload(): Promise<void> {
        await this._request('/nginx/reload', 'POST');
    }

    /**
     * Start the remote nginx.
     * @returns {Promise<void>}
     */
    public async start(): Promise<void> {
        await this._request('/nginx/start', 'POST');
    }

    /**
     * Stop the remote nginx.
     * @returns {Promise<void>}
     */
    public async stop(): Promise<void> {
        await this._request('/nginx/stop', 'POST');
    }

    /**
     * Test the remote nginx config (`nginx -t`).
     * @returns {Promise<boolean>}
     */
    public async testConfig(): Promise<boolean> {
        const response = await this._request('/nginx/test', 'POST');
        const body = await response.json() as {ok?: boolean;};

        return body.ok === true;
    }

    /**
     * Whether the remote nginx process is running.
     * @returns {Promise<boolean>}
     */
    public async status(): Promise<boolean> {
        try {
            const response = await this._request('/nginx/status', 'GET');
            const body = await response.json() as {running?: boolean;};

            return body.running === true;
        } catch (error) {
            // A health probe must not throw; an unreachable agent means unhealthy.
            Logger.getLogger().silly('NginxControlClient::status: probe failed: %s', `${error}`);

            return false;
        }
    }

}