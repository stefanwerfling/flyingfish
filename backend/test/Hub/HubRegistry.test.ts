/**
 * Unit tests for the in-memory Hub registry skeleton (v2 DNS pilot).
 *
 * Covers register/heartbeat/bye, the online->degraded->offline state machine
 * (with an injected clock) and the aggregation of UI contributions from online
 * parts. Network-free.
 */
import {CapabilityManifest, buildDnsCapabilityManifest} from 'flyingfish_schemas';
import {HubRegistry, RegistryPartStatus} from '../../src/Application/Hub/HubRegistry.js';

describe('HubRegistry (in-memory skeleton)', () => {
    test('register adds an online part from a valid manifest', () => {
        const registry = new HubRegistry();

        const part = registry.register(buildDnsCapabilityManifest('dns-1'), 1000);

        expect(part.status).toBe(RegistryPartStatus.online);
        expect(part.registeredAt).toBe(1000);
        expect(registry.list()).toHaveLength(1);
        expect(registry.get('dns-1')?.manifest.part.id).toBe('dns');
    });

    test('register rejects an invalid manifest', () => {
        const registry = new HubRegistry();
        const invalid = {schemaVersion: '1.0.0'} as unknown as CapabilityManifest;

        expect(() => registry.register(invalid, 0)).toThrow('invalid manifest');
        expect(registry.list()).toHaveLength(0);
    });

    test('re-register keeps the original registeredAt', () => {
        const registry = new HubRegistry();

        registry.register(buildDnsCapabilityManifest('dns-1'), 1000);
        const again = registry.register(buildDnsCapabilityManifest('dns-1'), 5000);

        expect(again.registeredAt).toBe(1000);
        expect(again.lastHeartbeat).toBe(5000);
        expect(registry.list()).toHaveLength(1);
    });

    test('heartbeat updates a known part and reports unknown ones', () => {
        const registry = new HubRegistry();
        registry.register(buildDnsCapabilityManifest('dns-1'), 1000);

        expect(registry.heartbeat('dns-1', 2000)).toBe(true);
        expect(registry.get('dns-1')?.lastHeartbeat).toBe(2000);
        expect(registry.heartbeat('nope', 2000)).toBe(false);
    });

    test('health transitions online -> degraded -> offline by heartbeat age', () => {
        const registry = new HubRegistry({degradedAfterMs: 1000, offlineAfterMs: 2000});
        registry.register(buildDnsCapabilityManifest('dns-1'), 0);

        registry.evaluateHealth(500);
        expect(registry.get('dns-1')?.status).toBe(RegistryPartStatus.online);

        registry.evaluateHealth(1500);
        expect(registry.get('dns-1')?.status).toBe(RegistryPartStatus.degraded);

        registry.evaluateHealth(2500);
        expect(registry.get('dns-1')?.status).toBe(RegistryPartStatus.offline);
    });

    test('a heartbeat recovers an offline part to online', () => {
        const registry = new HubRegistry({degradedAfterMs: 1000, offlineAfterMs: 2000});
        registry.register(buildDnsCapabilityManifest('dns-1'), 0);

        registry.evaluateHealth(3000);
        expect(registry.get('dns-1')?.status).toBe(RegistryPartStatus.offline);

        registry.heartbeat('dns-1', 3100);
        expect(registry.get('dns-1')?.status).toBe(RegistryPartStatus.online);
    });

    test('bye removes a part', () => {
        const registry = new HubRegistry();
        registry.register(buildDnsCapabilityManifest('dns-1'), 0);

        expect(registry.bye('dns-1')).toBe(true);
        expect(registry.bye('dns-1')).toBe(false);
        expect(registry.list()).toHaveLength(0);
    });

    test('uiContributions aggregates the DNS menu + page while online', () => {
        const registry = new HubRegistry();
        registry.register(buildDnsCapabilityManifest('dns-1'), 0);

        const ui = registry.uiContributions();
        expect(ui.menu.map((m) => m.id)).toContain('dns');
        expect(ui.pages.map((p) => p.id)).toContain('dns-records');
    });

    test('uiContributions excludes offline parts', () => {
        const registry = new HubRegistry({degradedAfterMs: 1000, offlineAfterMs: 2000});
        registry.register(buildDnsCapabilityManifest('dns-1'), 0);

        registry.evaluateHealth(3000);

        expect(registry.uiContributions().menu).toHaveLength(0);
        expect(registry.uiContributions().pages).toHaveLength(0);
    });

    test('uiContributions orders the menu by order', () => {
        const registry = new HubRegistry();
        const manifest = buildDnsCapabilityManifest('dns-1');
        manifest.capabilities[0].ui!.menu = [
            {id: 'b', label: 'B', order: 20},
            {id: 'a', label: 'A', order: 10}
        ];
        registry.register(manifest, 0);

        expect(registry.uiContributions().menu.map((m) => m.id)).toEqual(['a', 'b']);
    });
});