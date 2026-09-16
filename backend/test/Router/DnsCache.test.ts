/**
 * Tests for the resolver TTL cache (Pi-router epic, Phase 5): get/set with TTL
 * expiry, non-positive TTL not cached, and oldest-key eviction past the bound. `now`
 * is injected so time is deterministic.
 */
import {DnsCache} from 'flyingfish_core';

describe('DnsCache', () => {
    test('stores and returns a value within its TTL, expiring after', () => {
        const cache = new DnsCache<string[]>();
        const key = DnsCache.key('example.test', 1);

        cache.set(key, ['1.2.3.4'], 60, 1000);

        expect(cache.get(key, 1000)).toEqual(['1.2.3.4']);
        expect(cache.get(key, 1000 + (59 * 1000))).toEqual(['1.2.3.4']);
        // at/after expiry → gone
        expect(cache.get(key, 1000 + (60 * 1000))).toBeNull();
        expect(cache.size()).toBe(0);
    });

    test('a non-positive TTL is not cached', () => {
        const cache = new DnsCache<string[]>();
        cache.set('k', ['x'], 0, 1000);
        cache.set('k', ['x'], -5, 1000);

        expect(cache.get('k', 1000)).toBeNull();
    });

    test('a missing key returns null', () => {
        expect(new DnsCache<string[]>().get('nope', 1000)).toBeNull();
    });

    test('evicts the oldest key past the size bound', () => {
        const cache = new DnsCache<number>(2);
        cache.set('a', 1, 60, 1000);
        cache.set('b', 2, 60, 1000);
        // adding a third key past the bound of 2 evicts the oldest ('a')
        cache.set('c', 3, 60, 1000);

        expect(cache.get('a', 1000)).toBeNull();
        expect(cache.get('b', 1000)).toBe(2);
        expect(cache.get('c', 1000)).toBe(3);
    });
});