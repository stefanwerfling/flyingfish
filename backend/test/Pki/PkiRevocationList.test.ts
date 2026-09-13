/**
 * Unit tests for the PKI revocation list (roadmap 9.4.4, slice A) — the in-memory
 * real-time Hub allowlist: revoke a stable nodeUid, test membership, rebuild from
 * the persisted revocation records. Network-free.
 */
import {PkiRevocationList} from 'flyingfish_core';

describe('PkiRevocationList (v2, 9.4.4)', () => {
    test('revoke then isRevoked', () => {
        const list = new PkiRevocationList();

        expect(list.isRevoked('uid-1')).toBe(false);

        list.revoke('uid-1', 1000);

        expect(list.isRevoked('uid-1')).toBe(true);
        expect(list.size()).toBe(1);
    });

    test('revoke is idempotent and keeps the first timestamp', () => {
        const list = new PkiRevocationList();

        list.revoke('uid-1', 1000);
        list.revoke('uid-1', 2000);

        expect(list.size()).toBe(1);
        expect(list.list()[0].revokedAt).toBe(1000);
    });

    test('load rebuilds from persisted entries, replacing the contents', () => {
        const list = new PkiRevocationList();

        list.revoke('stale', 500);
        list.load([{nodeUid: 'a', revokedAt: 1}, {nodeUid: 'b', revokedAt: 2}]);

        expect(list.isRevoked('stale')).toBe(false);
        expect(list.isRevoked('a')).toBe(true);
        expect(list.isRevoked('b')).toBe(true);
        expect(list.size()).toBe(2);
    });

    test('clear empties the list', () => {
        const list = new PkiRevocationList();

        list.revoke('a', 1);
        list.clear();

        expect(list.size()).toBe(0);
        expect(list.isRevoked('a')).toBe(false);
    });
});