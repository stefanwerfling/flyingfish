import {Logger} from '@stefanwerfling/figtree';
import {SchemaSshConfigChangesResponse} from 'flyingfish_schemas';
import {SshServer} from '../Ssh/SshServer.js';

/**
 * The registry secret header the Hub authenticates service parts with.
 */
const HEADER_REGISTRY_SECRET = 'x-flyingfish-registry-secret';

/**
 * Default poll interval (ms).
 */
const DEFAULT_INTERVAL_MS = 15000;

/**
 * A minimal fetch signature (injectable for tests).
 */
export type SshPollFetch = (
    url: string,
    init?: {method?: string; headers?: Record<string, string>; body?: string;}
) => Promise<{json(): Promise<unknown>;}>;

/**
 * SshConfigPoller
 *
 * Polls the backend for SSH config changes (POST /json/ssh/config-changes with a
 * sequence cursor) and applies each one to the running {@link SshServer} so a
 * long-lived tunnel is reloaded (saved) or closed (deleted). Replaces the former
 * SSH_CONFIG_CHANGED Redis subscriber. Best-effort — a failed poll is swallowed
 * and retried on the next tick; the ssh server keeps relying on the shared DB
 * (read on (re)connect) regardless.
 */
export class SshConfigPoller {

    private readonly _hubUrl: string;

    private readonly _secret: string;

    private readonly _server: SshServer;

    private readonly _intervalMs: number;

    private readonly _fetch: SshPollFetch;

    /**
     * The last processed sequence id (cursor).
     * @private
     */
    private _cursor = 0;

    /**
     * The interval handle, if started.
     * @private
     */
    private _timer: ReturnType<typeof setInterval>|null = null;

    /**
     * @param hubUrl - the Hub (backend) base url
     * @param secret - the registry shared secret
     * @param server - the ssh server whose active connections react to changes
     * @param intervalMs - poll interval in ms (defaults to 15s)
     * @param fetchImpl - optional fetch implementation (defaults to the global fetch)
     */
    public constructor(
        hubUrl: string,
        secret: string,
        server: SshServer,
        intervalMs: number = DEFAULT_INTERVAL_MS,
        fetchImpl?: SshPollFetch
    ) {
        this._hubUrl = hubUrl.replace(/\/+$/u, '');
        this._secret = secret;
        this._server = server;
        this._intervalMs = intervalMs;
        this._fetch = fetchImpl ?? (fetch as unknown as SshPollFetch);
    }

    /**
     * Poll once and apply any changes. Returns the number of changes applied
     * (0 on error, no changes, or a reset).
     */
    public async pollOnce(): Promise<number> {
        try {
            const response = await this._fetch(`${this._hubUrl}/json/ssh/config-changes`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    [HEADER_REGISTRY_SECRET]: this._secret
                },
                body: JSON.stringify({since: this._cursor})
            });

            const data = await response.json();

            if (!SchemaSshConfigChangesResponse.validate(data, [])) {
                Logger.getLogger().warn('SshConfigPoller::pollOnce: invalid response, ignored.');
                return 0;
            }

            // Backend restarted or we fell behind the retained window: adopt the
            // current sequence. Any missed change is covered by the ssh server
            // re-reading the shared DB when a tunnel (re)connects.
            if (data.reset) {
                this._cursor = data.lastSeq;
                return 0;
            }

            for (const change of data.changes) {
                Logger.getLogger().info(
                    'SshConfigPoller::pollOnce: ssh config %s for sshportId %d',
                    change.action,
                    change.sshportId
                );

                this._server.handleConfigChange(change.sshportId, change.action);
            }

            this._cursor = data.lastSeq;

            return data.changes.length;
        } catch (error) {
            Logger.getLogger().error('SshConfigPoller::pollOnce: failed to poll SSH config changes', error);
            return 0;
        }
    }

    /**
     * Start the poll loop (an immediate poll, then on the configured interval).
     */
    public start(): void {
        if (this._timer !== null) {
            return;
        }

        void this.pollOnce();

        this._timer = setInterval((): void => {
            void this.pollOnce();
        }, this._intervalMs);
    }

    /**
     * Stop the poll loop.
     */
    public stop(): void {
        if (this._timer !== null) {
            clearInterval(this._timer);
            this._timer = null;
        }
    }

}
