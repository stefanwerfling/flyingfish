/**
 * Unit tests for the Hub's cluster local-state provider (Cluster/Mesh epic 9.5.12
 * phase 3): it publishes a hub descriptor and each of the Hub's domains as a
 * `domain:<id>` summary (name + failover priority + flags), so domains become
 * cluster-wide known. The domain source is injected, so no database is needed.
 */
import {ClusterLocalStateProvider} from '../../src/Application/Hub/ClusterLocalStateProvider.js';

describe('ClusterLocalStateProvider', () => {
    test('publishes a hub descriptor plus a domain:<id> summary per domain', async() => {
        const provider = new ClusterLocalStateProvider(async() => [
            {id: 1, domainname: 'a.test', disable: false, fixdomain: true, recordless: false, parent_id: 0, cluster_priority: 0},
            {id: 2, domainname: 'b.test', disable: true, fixdomain: false, recordless: true, parent_id: 1, cluster_priority: 5}
        ]);

        const entries = await provider.entries();

        expect(entries[0].key).toBe('hub');
        expect(entries.map((entry) => entry.key)).toEqual(['hub', 'domain:1', 'domain:2']);

        // the published priority reflects the domain's cluster_priority field (9.5.14)
        expect(entries[1].value).toEqual({
            id: 1, name: 'a.test', priority: 0, disable: false, fix: true, recordless: false, parentId: 0
        });
        expect(entries[2].value).toEqual({
            id: 2, name: 'b.test', priority: 5, disable: true, fix: false, recordless: true, parentId: 1
        });
    });

    test('publishes just the hub descriptor when there are no domains', async() => {
        const provider = new ClusterLocalStateProvider(async() => []);
        const entries = await provider.entries();

        expect(entries.map((entry) => entry.key)).toEqual(['hub']);
    });
});