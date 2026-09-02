/**
 * Unit tests for the 9.2.5 fault-isolation slice: the ServiceImportance
 * classification of the FlyingFish-owned services and their health checks
 * (NginxService, FlyingFishHttpService). Network/DB-free. The DNS server moved
 * to its own container (9.2.3), so its fault-isolation lives there now.
 */
import {jest} from '@jest/globals';
import {ServiceImportance} from 'figtree-schemas';
import {NginxProcess} from '../../src/inc/Nginx/NginxProcess.js';
import {NginxService} from '../../src/Application/Service/NginxService.js';
import {HubRegistryService} from '../../src/Application/Hub/HubRegistryService.js';
import {FlyingFishHttpService} from '../../src/Application/Server/FlyingFishHttpService.js';
import {RouteLoader} from '../../src/Application/Routes/RouteLoader.js';

describe('Fault isolation (9.2.5)', () => {
    test('NginxService is Important and its health check follows the nginx process', async() => {
        const nginx = NginxService.getInstance();

        expect(nginx.getImportance()).toBe(ServiceImportance.Important);

        const isRun = jest.spyOn(NginxProcess.prototype, 'isRun');

        isRun.mockResolvedValue(true);
        expect(await nginx.healthCheck()).toBe(true);

        isRun.mockResolvedValue(false);
        expect(await nginx.healthCheck()).toBe(false);

        isRun.mockRestore();
    });

    test('HubRegistryService is Important', () => {
        expect(HubRegistryService.getInstance().getImportance()).toBe(ServiceImportance.Important);
    });

    test('FlyingFishHttpService is Important, health-checks listening, and is restart-safe', async() => {
        const http = new FlyingFishHttpService(RouteLoader);
        const state = http as unknown as {_server: unknown; _releaseServer(): void;};

        expect(http.getImportance()).toBe(ServiceImportance.Important);

        // No server yet -> unhealthy.
        expect(await http.healthCheck()).toBe(false);

        // Listening -> healthy; not listening -> unhealthy.
        state._server = {getServer: (): {listening: boolean;} => ({listening: true})};
        expect(await http.healthCheck()).toBe(true);
        state._server = {getServer: (): {listening: boolean;} => ({listening: false})};
        expect(await http.healthCheck()).toBe(false);

        // Restart-safe: a leftover server is closed before re-listen.
        const close = jest.fn();
        state._server = {close: close, getServer: (): null => null};
        state._releaseServer();
        expect(close).toHaveBeenCalledTimes(1);
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