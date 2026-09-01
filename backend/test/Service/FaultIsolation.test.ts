/**
 * Unit tests for the 9.2.5 fault-isolation slice: the ServiceImportance
 * classification of the FlyingFish-owned services and the two service health
 * checks (NginxService, Dns2Server). Network/DB-free.
 */
import {jest} from '@jest/globals';
import net from 'net';
import {ServiceImportance} from 'figtree-schemas';
import {NginxProcess} from '../../src/inc/Nginx/NginxProcess.js';
import {NginxService} from '../../src/Application/Service/NginxService.js';
import {Dns2Server} from '../../src/inc/Dns/Dns2Server.js';
import {HubRegistryService} from '../../src/Application/Hub/HubRegistryService.js';

describe('Fault isolation (9.2.5)', () => {
    test('NginxService is Important and its health check follows the nginx process', async() => {
        const nginx = NginxService.getInstance();

        expect(nginx.getImportance()).toBe(ServiceImportance.Important);

        const isRun = jest.spyOn(NginxProcess.prototype, 'isRun');

        isRun.mockReturnValue(true);
        expect(await nginx.healthCheck()).toBe(true);

        isRun.mockReturnValue(false);
        expect(await nginx.healthCheck()).toBe(false);

        isRun.mockRestore();
    });

    test('Dns2Server is Important and its health check probes the TCP port', async() => {
        const dns = Dns2Server.getInstance();

        expect(dns.getImportance()).toBe(ServiceImportance.Important);

        // Not started yet -> unhealthy (fast gate before the probe).
        expect(await dns.healthCheck()).toBe(false);

        // A live TCP listener stands in for the bound DNS TCP socket.
        const server = net.createServer();
        const port = await new Promise<number>((resolve) => {
            server.listen(0, '127.0.0.1', (): void => {
                resolve((server.address() as net.AddressInfo).port);
            });
        });

        const state = dns as unknown as {_listening: boolean; _boundPort: number;};
        state._listening = true;
        state._boundPort = port;
        expect(await dns.healthCheck()).toBe(true);

        // Socket gone -> probe fails -> unhealthy (would trigger a restart).
        await new Promise<void>((resolve) => {
            server.close((): void => {
                resolve();
            });
        });
        expect(await dns.healthCheck()).toBe(false);
    });

    test('HubRegistryService is Important', () => {
        expect(HubRegistryService.getInstance().getImportance()).toBe(ServiceImportance.Important);
    });

    test('Dns2Server.start is restart-safe: closes + recreates the server on restart', async() => {
        const state = Dns2Server.getInstance() as unknown as {
            _resetServer(): Promise<void>;
            _listening: boolean;
            _server: unknown;
        };

        // Not listening -> reset keeps the current server (no-op).
        const before = state._server;
        state._listening = false;
        await state._resetServer();
        expect(state._server).toBe(before);

        // Leftover bound sockets from a prior start -> close old + recreate + clear flag.
        const close = jest.fn(() => Promise.resolve());
        const stale = {close: close};
        state._server = stale;
        state._listening = true;

        await state._resetServer();

        expect(close).toHaveBeenCalledTimes(1);
        expect(state._listening).toBe(false);
        expect(state._server).not.toBe(stale);
    });

    test('NginxService.start is restart-safe: releases leftover sub-servers', async() => {
        const svc = NginxService.getInstance() as unknown as {
            _releaseRunningServers(): Promise<void>;
            _control: unknown;
        };

        // Fresh: no control server, access-log not started -> safe no-op.
        await expect(svc._releaseRunningServers()).resolves.toBeUndefined();

        // A control server left over from a previous start must be closed and
        // dropped so the restart's re-listen does not collide.
        const close = jest.fn();
        svc._control = {close: close};

        await svc._releaseRunningServers();

        expect(close).toHaveBeenCalledTimes(1);
        expect(svc._control).toBeNull();
    });
});