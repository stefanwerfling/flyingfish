import * as fs from 'fs';
import * as net from 'net';

/**
 * Issues one fresh bootstrap token for the requested CA purpose (called once per
 * socket connection). The purpose is the client's request; the issuer validates
 * it (co-location trust — a part that reaches the socket may pick its purpose).
 */
export type PkiBootstrapTokenIssuer = (purpose: string) => string;

// If the client sends no purpose line within this window, vend with an empty
// purpose (the issuer then applies its default). Guards against a stuck client.
const PURPOSE_READ_TIMEOUT_MS = 2000;

/**
 * Local unix-socket bootstrap-token vending server (own-PKI epic 9.4, 9.4.3-D).
 *
 * On a single-machine compose deployment the trust anchor for first enrollment
 * is co-location: a part that can reach this unix socket (mounted only into the
 * FlyingFish parts) is a legitimate node. On each connection the server issues a
 * fresh single-use, short-TTL, auto-approve token and hands it to the client,
 * which then enrolls over HTTP. No shared secret in the environment, no manual
 * per-node step — access to the socket is the credential.
 *
 * The token issuer is injected (the pkiserver wires it to its
 * PkiBootstrapTokenStore), so this stays testable with a fake issuer.
 */
export class PkiBootstrapSocketServer {

    private readonly _path: string;

    private readonly _issue: PkiBootstrapTokenIssuer;

    private _server: net.Server | null = null;

    /**
     * @param socketPath - the unix socket path to bind
     * @param issue - issues one bootstrap token per connection
     */
    public constructor(socketPath: string, issue: PkiBootstrapTokenIssuer) {
        this._path = socketPath;
        this._issue = issue;
    }

    /**
     * Bind the socket and start vending tokens. Removes a stale socket file first.
     */
    public async listen(): Promise<void> {
        await this._unlinkIfExists();

        this._server = net.createServer((socket: net.Socket): void => {
            let data = '';
            let vended = false;

            const vend = (purpose: string): void => {
                if (vended) {
                    return;
                }

                vended = true;

                try {
                    socket.end(`${this._issue(purpose)}\n`);
                } catch {
                    socket.destroy();
                }
            };

            // The client sends "<purpose>\n" first; vend a token for it. Fall back
            // to an empty purpose (issuer default) if nothing arrives in time.
            const timer = setTimeout((): void => vend(''), PURPOSE_READ_TIMEOUT_MS);

            socket.setEncoding('utf-8');

            socket.on('data', (chunk: string): void => {
                data += chunk;

                const newline = data.indexOf('\n');

                if (newline !== -1) {
                    clearTimeout(timer);
                    vend(data.slice(0, newline).trim());
                }
            });

            socket.on('error', (): void => {
                clearTimeout(timer);
                socket.destroy();
            });
        });

        const server = this._server;

        await new Promise<void>((resolve, reject): void => {
            server.once('error', reject);
            server.listen(this._path, (): void => {
                resolve();
            });
        });
    }

    /**
     * Stop the server and remove the socket file.
     */
    public async close(): Promise<void> {
        const server = this._server;

        if (server !== null) {
            await new Promise<void>((resolve): void => {
                server.close((): void => {
                    resolve();
                });
            });

            this._server = null;
        }

        await this._unlinkIfExists();
    }

    /**
     * Remove the socket file if it exists (ignore if it does not).
     */
    private async _unlinkIfExists(): Promise<void> {
        try {
            await fs.promises.unlink(this._path);
        } catch {
            /* no stale socket to remove */
        }
    }

}