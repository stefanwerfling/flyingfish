import * as net from 'net';

const DEFAULT_RETRIES = 10;
const DEFAULT_RETRY_DELAY_MS = 500;
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Client for the local unix-socket bootstrap-token vending server (own-PKI epic
 * 9.4, 9.4.3-D). A part connects at boot and reads the single-use token the
 * server issues, then enrolls with it over HTTP. Retries a few times so a part
 * that boots slightly ahead of the pkiserver still gets its token.
 */
export class PkiBootstrapSocketClient {

    private readonly _path: string;

    private readonly _retries: number;

    private readonly _retryDelayMs: number;

    private readonly _timeoutMs: number;

    /**
     * @param socketPath - the unix socket path to connect to
     * @param retries - connection attempts before giving up
     * @param retryDelayMs - delay between attempts
     * @param timeoutMs - per-attempt timeout
     */
    public constructor(
        socketPath: string,
        retries: number = DEFAULT_RETRIES,
        retryDelayMs: number = DEFAULT_RETRY_DELAY_MS,
        timeoutMs: number = DEFAULT_TIMEOUT_MS
    ) {
        this._path = socketPath;
        this._retries = retries;
        this._retryDelayMs = retryDelayMs;
        this._timeoutMs = timeoutMs;
    }

    /**
     * Fetch a bootstrap token for a CA purpose, retrying on connection failure
     * (the pkiserver may not have bound the socket yet). The requested purpose is
     * sent to the server, which vends a token for it (co-location trust). Throws
     * if no token arrives within the retry budget.
     * @param purpose - the CA purpose to request a token for (empty = server default)
     */
    public async fetchToken(purpose: string = ''): Promise<string> {
        let lastError: unknown = null;

        for (let attempt = 0; attempt < this._retries; attempt++) {
            try {
                // eslint-disable-next-line no-await-in-loop -- sequential retry
                return await this._connectOnce(purpose);
            } catch (error) {
                lastError = error;

                // eslint-disable-next-line no-await-in-loop -- backoff between retries
                await PkiBootstrapSocketClient._delay(this._retryDelayMs);
            }
        }

        throw new Error(`PkiBootstrapSocketClient: no token from ${this._path} after ${this._retries} attempts: ${lastError}`);
    }

    /**
     * A single connect-write-read-close attempt: send the requested purpose line,
     * then read the vended token.
     * @param purpose - the CA purpose to request
     */
    private async _connectOnce(purpose: string): Promise<string> {
        return new Promise<string>((resolve, reject): void => {
            const socket = net.createConnection(this._path);
            let data = '';

            const timer = setTimeout((): void => {
                socket.destroy();
                reject(new Error('PkiBootstrapSocketClient: timeout'));
            }, this._timeoutMs);

            socket.setEncoding('utf-8');

            socket.on('connect', (): void => {
                socket.write(`${purpose}\n`);
            });

            socket.on('data', (chunk: string): void => {
                data += chunk;
            });

            socket.on('end', (): void => {
                clearTimeout(timer);

                const token = data.trim();

                if (token === '') {
                    reject(new Error('PkiBootstrapSocketClient: empty token'));
                } else {
                    resolve(token);
                }
            });

            socket.on('error', (error: Error): void => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }

    /**
     * Resolve after the given delay.
     * @param ms - the delay in ms
     */
    private static async _delay(ms: number): Promise<void> {
        return new Promise<void>((resolve): void => {
            setTimeout((): void => {
                resolve();
            }, ms);
        });
    }

}