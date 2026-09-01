/**
 * Unit tests for the v2 capability manifest of the SSH part.
 *
 * Validates the concrete SSH capability manifest against the VTS
 * SchemaCapabilityManifest and checks the event-consumer shape (the
 * ssh_config_changed IPC channel) that DNS/nginx do not have. Network-free.
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

    test('consumes the ssh_config_changed IPC channel', () => {
        const manifest = buildSshCapabilityManifest('ssh-instance-1');
        const cap = manifest.capabilities[0];

        expect(cap.events).toContain('ssh_config_changed');

        const channelAction = cap.api?.find((a) => a.channel === 'ssh_config_changed');

        expect(channelAction).toBeDefined();
        expect(channelAction?.method).toBeUndefined();
        expect(channelAction?.requestSchema).toBe('SchemaSshConfigChanged');
    });

    test('exposes the read-only ssh port list HTTP action', () => {
        const manifest = buildSshCapabilityManifest('ssh-instance-1');
        const list = manifest.capabilities[0].api?.find((a) => a.action === 'ssh-port-list');

        expect(list?.method).toBe('GET');
        expect(list?.path).toBe('/ssh/list');
        expect(list?.responseSchema).toBe('SchemaSshPortListResponse');
    });
});