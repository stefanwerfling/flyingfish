/**
 * Unit tests for the v2 capability manifest of the nginx part.
 *
 * Validates the concrete nginx capability manifest against the VTS
 * SchemaCapabilityManifest and checks the multi-capability shape (listen +
 * routing) plus the dependsOn wiring. Network-free (pure schema validation).
 */
import {CapabilityUiRenderType, SchemaCapabilityManifest, buildNginxCapabilityManifest} from 'flyingfish_schemas';

describe('Capability manifest (nginx part)', () => {
    test('the nginx manifest validates against the schema', () => {
        const errors: unknown[] = [];
        const manifest = buildNginxCapabilityManifest('nginx-instance-1');

        const valid = SchemaCapabilityManifest.validate(manifest, errors);

        expect(valid).toBe(true);
        expect(errors).toEqual([]);
    });

    test('carries the instance id and the nginx roles', () => {
        const manifest = buildNginxCapabilityManifest('nginx-instance-1');

        expect(manifest.part.instanceId).toBe('nginx-instance-1');
        expect(manifest.part.roles).toContain('nginx');
        expect(manifest.part.roles).toContain('reverse-proxy');
    });

    test('exposes the listen and routing capabilities with a dependency', () => {
        const manifest = buildNginxCapabilityManifest('nginx-instance-1');
        const keys = manifest.capabilities.map((c) => c.key);

        expect(keys).toEqual(['nginx-listen', 'nginx-routing']);

        const routing = manifest.capabilities.find((c) => c.key === 'nginx-routing');

        expect(routing?.dependsOn).toContain('nginx-listen');
    });

    test('the listen capability contributes the nginx menu, routing hangs off it', () => {
        const manifest = buildNginxCapabilityManifest('nginx-instance-1');
        const listen = manifest.capabilities.find((c) => c.key === 'nginx-listen');
        const routing = manifest.capabilities.find((c) => c.key === 'nginx-routing');

        expect(listen?.ui?.menu?.[0].id).toBe('nginx');
        expect(listen?.ui?.pages?.[0].render).toBe(CapabilityUiRenderType.schema);
        // routing has no own menu entry; its page reuses the nginx menu
        expect(routing?.ui?.menu).toBeUndefined();
        expect(routing?.ui?.pages?.[0].menuId).toBe('nginx');
    });

    test('every api action declares a method and a path', () => {
        const manifest = buildNginxCapabilityManifest('nginx-instance-1');
        const actions = manifest.capabilities.flatMap((c) => c.api ?? []);

        expect(actions.length).toBeGreaterThan(0);

        for (const action of actions) {
            expect(action.method).toBeDefined();
            expect(action.path?.startsWith('/nginx/')).toBe(true);
        }
    });
});