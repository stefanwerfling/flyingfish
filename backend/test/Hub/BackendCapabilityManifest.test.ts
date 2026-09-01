/**
 * Unit tests for the v2 capability manifest of the backend part itself.
 *
 * The backend hosts the Hub but is also a part (dashboard/credentials/users/
 * settings). Validates the manifest against the schema and checks the
 * capability set + the users->settings dependency. Network-free.
 */
import {SchemaCapabilityManifest, buildBackendCapabilityManifest} from 'flyingfish_schemas';

describe('Capability manifest (backend part)', () => {
    test('the backend manifest validates against the schema', () => {
        const errors: unknown[] = [];
        const manifest = buildBackendCapabilityManifest('backend-instance-1');

        const valid = SchemaCapabilityManifest.validate(manifest, errors);

        expect(valid).toBe(true);
        expect(errors).toEqual([]);
    });

    test('carries the instance id and the backend/hub roles', () => {
        const manifest = buildBackendCapabilityManifest('backend-instance-1');

        expect(manifest.part.instanceId).toBe('backend-instance-1');
        expect(manifest.part.roles).toContain('backend');
        expect(manifest.part.roles).toContain('hub');
    });

    test('exposes the core admin capabilities with users depending on settings', () => {
        const manifest = buildBackendCapabilityManifest('backend-instance-1');
        const keys = manifest.capabilities.map((c) => c.key);

        expect(keys).toEqual(['dashboard', 'credentials', 'settings', 'users']);

        const users = manifest.capabilities.find((c) => c.key === 'users');

        expect(users?.dependsOn).toContain('settings');
    });

    test('every api action is under the /backend/ namespace', () => {
        const manifest = buildBackendCapabilityManifest('backend-instance-1');
        const actions = manifest.capabilities.flatMap((c) => c.api ?? []);

        expect(actions.length).toBeGreaterThan(0);

        for (const action of actions) {
            expect(action.path?.startsWith('/backend/')).toBe(true);
        }
    });
});