/**
 * Unit tests for the v2 capability manifest contract (DNS pilot).
 *
 * Validates the concrete DNS capability manifest against the VTS
 * SchemaCapabilityManifest and checks that malformed manifests are rejected.
 * Network-free (pure schema validation).
 */
import {CapabilityUiRenderType, SchemaCapabilityManifest} from 'flyingfish_schemas';
import {buildDnsCapabilityManifest} from '../../src/inc/Dns/DnsCapabilityManifest.js';

describe('Capability manifest (DNS pilot)', () => {
    test('the DNS manifest validates against the schema', () => {
        const errors: unknown[] = [];
        const manifest = buildDnsCapabilityManifest('dns-instance-1');

        const valid = SchemaCapabilityManifest.validate(manifest, errors);

        expect(valid).toBe(true);
        expect(errors).toEqual([]);
    });

    test('carries the dns-server capability and the instance id', () => {
        const manifest = buildDnsCapabilityManifest('dns-instance-1');

        expect(manifest.part.instanceId).toBe('dns-instance-1');
        expect(manifest.part.roles).toContain('dns-server');
        expect(manifest.capabilities).toHaveLength(1);
        expect(manifest.capabilities[0].key).toBe('dns-server');
        expect(manifest.capabilities[0].ui?.pages?.[0].render).toBe(CapabilityUiRenderType.schema);
    });

    test('rejects a manifest missing the part descriptor', () => {
        const valid = SchemaCapabilityManifest.validate({schemaVersion: '1.0.0', capabilities: []}, []);

        expect(valid).toBe(false);
    });

    test('rejects a capability page with an invalid render type', () => {
        const bad = {
            schemaVersion: '1.0.0',
            part: {id: 'dns', name: 'DNS', version: '1.0.0', instanceId: 'x', roles: []},
            capabilities: [
                {
                    key: 'dns-server',
                    version: '1.0.0',
                    dependsOn: [],
                    ui: {
                        pages: [
                            {id: 'p', route: '/p', menuId: 'm', render: 'invalid', permissions: []}
                        ]
                    }
                }
            ]
        };

        const valid = SchemaCapabilityManifest.validate(bad, []);

        expect(valid).toBe(false);
    });

    test('rejects a capability missing its key', () => {
        const bad = {
            schemaVersion: '1.0.0',
            part: {id: 'dns', name: 'DNS', version: '1.0.0', instanceId: 'x', roles: []},
            capabilities: [
                {version: '1.0.0', dependsOn: []}
            ]
        };

        const valid = SchemaCapabilityManifest.validate(bad, []);

        expect(valid).toBe(false);
    });
});