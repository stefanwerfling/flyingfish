/**
 * Unit tests for the unix-socket bootstrap-token channel (roadmap 9.4.3-D).
 * Drives the real server + client over a temp unix socket: the client fetches a
 * token the server issues (valid + single-use in the store), each connection
 * gets a distinct token, and fetchToken retries then fails when nothing listens.
 * Network-free (local socket only).
 */
import * as fs from 'fs';
import os from 'os';
import path from 'path';
import {
    PkiBootstrapSocketClient,
    PkiBootstrapSocketServer,
    PkiBootstrapTokenStore,
    PkiCaPurpose
} from 'flyingfish_core';

describe('PKI bootstrap socket (v2, 9.4.3-D)', () => {
    let tmpDir: string;
    let socketPath: string;
    let server: PkiBootstrapSocketServer | null;

    beforeEach(async() => {
        tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ff-sock-'));
        socketPath = path.join(tmpDir, 'enroll.sock');
        server = null;
    });

    afterEach(async() => {
        if (server !== null) {
            await server.close();
        }

        await fs.promises.rm(tmpDir, {recursive: true, force: true});
    });

    test('the client fetches a token the server issues (valid + single-use)', async() => {
        const tokens = new PkiBootstrapTokenStore();

        server = new PkiBootstrapSocketServer(
            socketPath,
            (): string => tokens.issue({purpose: PkiCaPurpose.service, autoApprove: true}).token
        );
        await server.listen();

        const token = await new PkiBootstrapSocketClient(socketPath).fetchToken();

        expect(token).toBeTruthy();
        expect(tokens.consume(token)?.purpose).toBe(PkiCaPurpose.service);
        expect(tokens.consume(token)).toBeNull();
    });

    test('each connection gets a distinct token', async() => {
        const tokens = new PkiBootstrapTokenStore();

        server = new PkiBootstrapSocketServer(
            socketPath,
            (): string => tokens.issue({purpose: PkiCaPurpose.service, autoApprove: true}).token
        );
        await server.listen();

        const client = new PkiBootstrapSocketClient(socketPath);
        const first = await client.fetchToken();
        const second = await client.fetchToken();

        expect(first).not.toBe(second);
    });

    test('fetchToken retries then fails when nothing is listening', async() => {
        const client = new PkiBootstrapSocketClient(socketPath, 2, 10, 200);

        await expect(client.fetchToken()).rejects.toThrow();
    });
});