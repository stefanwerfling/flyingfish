/**
 * Unit tests for the v2 capability manifest of the PKI part (own-PKI epic 9.4).
 *
 * Validates the concrete PKI capability manifest against the VTS
 * SchemaCapabilityManifest and checks the EST-style enrollment contract
 * (/pki/cacerts + /pki/enroll) and the certificate-tree db entities. Network-free.
 */
import {SchemaCapabilityManifest, buildPkiCapabilityManifest} from 'flyingfish_schemas';

describe('Capability manifest (PKI part)', () => {
    test('the PKI manifest validates against the schema', () => {
        const errors: unknown[] = [];
        const manifest = buildPkiCapabilityManifest('pki-instance-1');

        const valid = SchemaCapabilityManifest.validate(manifest, errors);

        expect(valid).toBe(true);
        expect(errors).toEqual([]);
    });

    test('carries the instance id and the pki-server role', () => {
        const manifest = buildPkiCapabilityManifest('pki-instance-1');

        expect(manifest.part.id).toBe('pki');
        expect(manifest.part.instanceId).toBe('pki-instance-1');
        expect(manifest.part.roles).toEqual(['pki-server']);
        expect(manifest.capabilities).toHaveLength(1);
        expect(manifest.capabilities[0].key).toBe('pki-server');
    });

    test('exposes the EST cacerts GET action', () => {
        const manifest = buildPkiCapabilityManifest('pki-instance-1');
        const cacerts = manifest.capabilities[0].api?.find((a) => a.action === 'pki-cacerts');

        expect(cacerts?.method).toBe('GET');
        expect(cacerts?.path).toBe('/pki/cacerts');
        expect(cacerts?.responseSchema).toBe('SchemaPkiCaCertsResponse');
    });

    test('exposes the CSR enrollment POST action', () => {
        const manifest = buildPkiCapabilityManifest('pki-instance-1');
        const enroll = manifest.capabilities[0].api?.find((a) => a.action === 'pki-enroll');

        expect(enroll?.method).toBe('POST');
        expect(enroll?.path).toBe('/pki/enroll');
        expect(enroll?.requestSchema).toBe('SchemaPkiEnrollRequest');
        expect(enroll?.responseSchema).toBe('SchemaPkiEnrollResponse');
    });

    test('exposes the EST re-enroll (renew) POST action', () => {
        const manifest = buildPkiCapabilityManifest('pki-instance-1');
        const renew = manifest.capabilities[0].api?.find((a) => a.action === 'pki-renew');

        expect(renew?.method).toBe('POST');
        expect(renew?.path).toBe('/pki/renew');
        expect(renew?.requestSchema).toBe('SchemaPkiRenewRequest');
        expect(renew?.responseSchema).toBe('SchemaPkiEnrollResponse');
    });

    test('declares the certificate-tree db entities', () => {
        const manifest = buildPkiCapabilityManifest('pki-instance-1');

        expect(manifest.capabilities[0].dbEntities).toEqual([
            'CaCertificate',
            'IssuedCertificate',
            'EnrollmentRequest'
        ]);
    });
});