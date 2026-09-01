/**
 * Unit tests for the v2 capability manifest of the HimHIP part.
 *
 * Validates the concrete HimHIP manifest against the VTS
 * SchemaCapabilityManifest and checks the minimal, UI-less/DB-less event-only
 * shape (Redis request/response channels). Network-free.
 */
import {SchemaCapabilityManifest, buildHimHIPCapabilityManifest} from 'flyingfish_schemas';

describe('Capability manifest (HimHIP part)', () => {
    test('the HimHIP manifest validates against the schema', () => {
        const errors: unknown[] = [];
        const manifest = buildHimHIPCapabilityManifest('himhip-instance-1');

        const valid = SchemaCapabilityManifest.validate(manifest, errors);

        expect(valid).toBe(true);
        expect(errors).toEqual([]);
    });

    test('is a minimal event-only part: no UI, no db entities', () => {
        const manifest = buildHimHIPCapabilityManifest('himhip-instance-1');
        const cap = manifest.capabilities[0];

        expect(manifest.part.roles).toEqual(['host-info']);
        expect(cap.ui).toBeUndefined();
        expect(cap.dbEntities).toBeUndefined();
    });

    test('declares both HimHIP Redis channels as events', () => {
        const manifest = buildHimHIPCapabilityManifest('himhip-instance-1');
        const cap = manifest.capabilities[0];

        expect(cap.events).toContain('himhip_update_request');
        expect(cap.events).toContain('himhip_update_response');

        const channels = (cap.api ?? []).map((a) => a.channel);

        expect(channels).toContain('himhip_update_request');
        expect(channels).toContain('himhip_update_response');
    });
});