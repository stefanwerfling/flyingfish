/**
 * Unit tests for the EST-style PKI enrollment wire schemas (own-PKI epic 9.4,
 * slice 9.4.6-B). These VTS schemas are the contract the PKI part container's
 * HTTP endpoints validate against; the tests pin the accepted/rejected shapes.
 * Network-free.
 */
import {
    SchemaPkiCaCertsResponse,
    SchemaPkiEnrollDecision,
    SchemaPkiEnrollRequest,
    SchemaPkiEnrollResponse
} from 'flyingfish_schemas';

describe('PKI enrollment wire schemas', () => {
    test('a minimal enroll request (csr + token + cn) validates', () => {
        const errors: unknown[] = [];

        const valid = SchemaPkiEnrollRequest.validate({
            csr: '-----BEGIN CERTIFICATE REQUEST-----\nAAAA\n-----END CERTIFICATE REQUEST-----',
            bootstrapToken: 'tok-123',
            commonName: 'node-a.internal'
        }, errors);

        expect(valid).toBe(true);
        expect(errors).toEqual([]);
    });

    test('an enroll request with optional sans + validityDays validates', () => {
        const errors: unknown[] = [];

        const valid = SchemaPkiEnrollRequest.validate({
            csr: 'csr-pem',
            bootstrapToken: 'tok-123',
            commonName: 'node-a.internal',
            sans: [{type: 'dns', value: 'node-a.internal'}, {type: 'ip', value: '10.0.0.5'}],
            validityDays: 7
        }, errors);

        expect(valid).toBe(true);
        expect(errors).toEqual([]);
    });

    test('an enroll request missing the csr is rejected', () => {
        const valid = SchemaPkiEnrollRequest.validate({
            bootstrapToken: 'tok-123',
            commonName: 'node-a.internal'
        }, []);

        expect(valid).toBe(false);
    });

    test('a san entry with an unknown type is rejected', () => {
        const valid = SchemaPkiEnrollRequest.validate({
            csr: 'csr-pem',
            bootstrapToken: 'tok-123',
            commonName: 'node-a.internal',
            sans: [{type: 'wat', value: 'x'}]
        }, []);

        expect(valid).toBe(false);
    });

    test('a pending enroll response (no issued) validates', () => {
        const errors: unknown[] = [];

        const valid = SchemaPkiEnrollResponse.validate({
            statusCode: 200,
            id: 'req-1',
            status: 'pending',
            nodeUid: 'uid-1',
            commonName: 'node-a.internal'
        }, errors);

        expect(valid).toBe(true);
        expect(errors).toEqual([]);
    });

    test('an issued enroll response carries the certificate + chain', () => {
        const errors: unknown[] = [];

        const valid = SchemaPkiEnrollResponse.validate({
            statusCode: 200,
            id: 'req-1',
            status: 'issued',
            nodeUid: 'uid-1',
            commonName: 'node-a.internal',
            issued: {
                nodeUid: 'uid-1',
                certificate: 'leaf-pem',
                chain: ['leaf-pem', 'intermediate-pem', 'root-pem']
            }
        }, errors);

        expect(valid).toBe(true);
        expect(errors).toEqual([]);
    });

    test('an approve/reject decision validates on requestId', () => {
        expect(SchemaPkiEnrollDecision.validate({requestId: 'req-1'}, [])).toBe(true);
        expect(SchemaPkiEnrollDecision.validate({}, [])).toBe(false);
    });

    test('the cacerts response validates a chain of PEMs', () => {
        const errors: unknown[] = [];

        const valid = SchemaPkiCaCertsResponse.validate({
            statusCode: 200,
            chain: ['intermediate-pem', 'root-pem']
        }, errors);

        expect(valid).toBe(true);
        expect(errors).toEqual([]);
    });
});