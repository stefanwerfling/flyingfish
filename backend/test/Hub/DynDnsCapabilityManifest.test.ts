/**
 * Unit tests for the v2 capability manifest of the DynDNS server part.
 *
 * Validates the concrete DynDNS manifest against the VTS
 * SchemaCapabilityManifest and checks it carries both the public update
 * protocol and the admin management actions. Network-free.
 */
import {SchemaCapabilityManifest} from 'flyingfish_schemas';
import {buildDynDnsCapabilityManifest} from '../../src/inc/DynDns/DynDnsCapabilityManifest.js';

describe('Capability manifest (DynDNS server part)', () => {
    test('the DynDNS manifest validates against the schema', () => {
        const errors: unknown[] = [];
        const manifest = buildDynDnsCapabilityManifest('ddns-instance-1');

        const valid = SchemaCapabilityManifest.validate(manifest, errors);

        expect(valid).toBe(true);
        expect(errors).toEqual([]);
    });

    test('carries the instance id and the dyndns-server role', () => {
        const manifest = buildDynDnsCapabilityManifest('ddns-instance-1');

        expect(manifest.part.instanceId).toBe('ddns-instance-1');
        expect(manifest.part.roles).toEqual(['dyndns-server']);
        expect(manifest.capabilities[0].key).toBe('dyndns-server');
    });

    test('exposes the public update protocol and the management actions', () => {
        const manifest = buildDynDnsCapabilityManifest('ddns-instance-1');
        const actions = (manifest.capabilities[0].api ?? []).map((a) => a.action);

        expect(actions).toContain('nic-update');
        expect(actions).toContain('update');
        expect(actions).toContain('server-save');
        expect(actions).toContain('server-delete');
    });

    test('the nic-update action carries the request schema', () => {
        const manifest = buildDynDnsCapabilityManifest('ddns-instance-1');
        const nic = manifest.capabilities[0].api?.find((a) => a.action === 'nic-update');

        expect(nic?.method).toBe('GET');
        expect(nic?.path).toBe('/ddns/nic/update');
        expect(nic?.requestSchema).toBe('SchemaRequestData');
    });
});