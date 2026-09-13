/**
 * Unit tests for the PKI revocation wire schemas (roadmap 9.4.4-B): the revoke
 * request (by nodeUid) and the revocation-list response the Hub allowlist is
 * rebuilt from. Network-free.
 */
import {SchemaPkiRevocationListResponse, SchemaPkiRevokeRequest} from 'flyingfish_schemas';

describe('PKI revocation wire schemas', () => {
    test('a revoke request validates on nodeUid (reason optional)', () => {
        expect(SchemaPkiRevokeRequest.validate({nodeUid: 'uid-1'}, [])).toBe(true);
        expect(SchemaPkiRevokeRequest.validate({nodeUid: 'uid-1', reason: 'compromised'}, [])).toBe(true);
    });

    test('a revoke request without nodeUid is rejected', () => {
        expect(SchemaPkiRevokeRequest.validate({reason: 'x'}, [])).toBe(false);
    });

    test('the revocation-list response validates a list of {nodeUid, revokedAt}', () => {
        const errors: unknown[] = [];

        const valid = SchemaPkiRevocationListResponse.validate({
            statusCode: 200,
            list: [{nodeUid: 'uid-1', revokedAt: 1234}, {nodeUid: 'uid-2', revokedAt: 5678}]
        }, errors);

        expect(valid).toBe(true);
        expect(errors).toEqual([]);
    });
});