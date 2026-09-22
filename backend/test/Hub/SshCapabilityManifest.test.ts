/**
 * Unit tests for the v2 capability manifest of the SSH part.
 *
 * Validates the concrete SSH capability manifest against the VTS
 * SchemaCapabilityManifest and checks the config-changes HTTP poll action (which
 * replaced the former ssh_config_changed Redis channel). Network-free.
 */
import {SchemaCapabilityManifest, buildSshCapabilityManifest} from 'flyingfish_schemas';

describe('Capability manifest (SSH part)', () => {
    test('the SSH manifest validates against the schema', () => {
        const errors: unknown[] = [];
        const manifest = buildSshCapabilityManifest('ssh-instance-1');

        const valid = SchemaCapabilityManifest.validate(manifest, errors);

        expect(valid).toBe(true);
        expect(errors).toEqual([]);
    });

    test('carries the instance id and the ssh-server role', () => {
        const manifest = buildSshCapabilityManifest('ssh-instance-1');

        expect(manifest.part.instanceId).toBe('ssh-instance-1');
        expect(manifest.part.roles).toEqual(['ssh-server']);
        expect(manifest.capabilities).toHaveLength(1);
        expect(manifest.capabilities[0].key).toBe('ssh-server');
    });

    test('polls the config-changes HTTP action (no Redis channel/events)', () => {
        const manifest = buildSshCapabilityManifest('ssh-instance-1');
        const cap = manifest.capabilities[0];

        expect(cap.events).toEqual([]);
        expect(cap.api?.some((a) => a.channel !== undefined)).toBe(false);

        const pollAction = cap.api?.find((a) => a.action === 'ssh-config-changes');

        expect(pollAction).toBeDefined();
        expect(pollAction?.method).toBe('POST');
        expect(pollAction?.path).toBe('/ssh/config-changes');
        expect(pollAction?.requestSchema).toBe('SchemaSshConfigChangesRequest');
        expect(pollAction?.responseSchema).toBe('SchemaSshConfigChangesResponse');
    });

    test('exposes the read-only ssh port list HTTP action', () => {
        const manifest = buildSshCapabilityManifest('ssh-instance-1');
        const list = manifest.capabilities[0].api?.find((a) => a.action === 'ssh-port-list');

        expect(list?.method).toBe('GET');
        expect(list?.path).toBe('/ssh/list');
        expect(list?.responseSchema).toBe('SchemaSshPortListResponse');
    });
});