/**
 * Unit tests for the 9.2.5 fault-isolation slice: the ServiceImportance
 * classification of the FlyingFish-owned services and the two service health
 * checks (NginxService, Dns2Server). Network/DB-free.
 */
import {jest} from '@jest/globals';
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

    test('Dns2Server is Important and its health check follows the listening flag', async() => {
        const dns = Dns2Server.getInstance();

        expect(dns.getImportance()).toBe(ServiceImportance.Important);

        // Not started yet -> not listening -> unhealthy.
        expect(await dns.healthCheck()).toBe(false);

        (dns as unknown as {_listening: boolean;})._listening = true;
        expect(await dns.healthCheck()).toBe(true);
    });

    test('HubRegistryService is Important', () => {
        expect(HubRegistryService.getInstance().getImportance()).toBe(ServiceImportance.Important);
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