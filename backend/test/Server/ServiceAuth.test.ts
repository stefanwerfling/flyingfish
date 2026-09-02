/**
 * Unit tests for the ServiceAuth shared-secret verification (phase 3, step 5.3).
 * Network-free.
 */
import {ServiceAuth} from 'flyingfish_core';

describe('ServiceAuth.verifySecret', () => {
    test('accepts a matching secret', () => {
        expect(ServiceAuth.verifySecret('s3cr3t-value', 's3cr3t-value')).toBe(true);
    });

    test('rejects a non-matching secret', () => {
        expect(ServiceAuth.verifySecret('wrong', 's3cr3t-value')).toBe(false);
    });

    test('rejects when the expected secret is empty (misconfiguration)', () => {
        expect(ServiceAuth.verifySecret('', '')).toBe(false);
        expect(ServiceAuth.verifySecret('anything', '')).toBe(false);
    });

    test('rejects secrets of different length without throwing', () => {
        expect(ServiceAuth.verifySecret('short', 'a-much-longer-secret-value')).toBe(false);
    });
});