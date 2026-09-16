/**
 * Unit tests for the Hub's cluster L4 route directory (Cluster/Mesh epic 9.5.4):
 * publish/refresh keyed by publisher nodeUid, flattening across publishers, TTL
 * eviction of a publisher that stops publishing, remove and clear. In-memory,
 * network-free.
 */
import {ClusterL4Route} from 'flyingfish_schemas';
import {ClusterL4RouteDirectory} from '../../src/Application/Hub/ClusterL4RouteDirectory.js';

const route = (id: string, ingressNodeUid: string, listenPort: number): ClusterL4Route => ({
    id: id,
    proto: 'tcp',
    ingressNodeUid: ingressNodeUid,
    listenPort: listenPort,
    egressNodeUid: 'node-egress',
    targetHost: '10.0.0.5',
    targetPort: 5432
});

describe('ClusterL4RouteDirectory', () => {
    test('publish then routes returns the published set', () => {
        const directory = new ClusterL4RouteDirectory();

        directory.publish('node-a', [route('r1', 'node-a', 6001)], 1000);

        const routes = directory.routes(1500);
        expect(routes).toHaveLength(1);
        expect(routes[0].id).toBe('r1');
    });

    test('flattens routes across multiple publishers', () => {
        const directory = new ClusterL4RouteDirectory();

        directory.publish('node-a', [route('r1', 'node-a', 6001)], 1000);
        directory.publish('node-b', [route('r2', 'node-b', 6002), route('r3', 'node-b', 6003)], 1000);

        expect(directory.routes(1500).map((entry) => entry.id).sort()).toEqual(['r1', 'r2', 'r3']);
    });

    test('a second publish replaces a publisher set in place and refreshes the TTL', () => {
        const directory = new ClusterL4RouteDirectory(1000);

        directory.publish('node-a', [route('r1', 'node-a', 6001)], 1000);
        directory.publish('node-a', [route('r2', 'node-a', 6002)], 1500);

        const routes = directory.routes(2000);
        expect(routes.map((entry) => entry.id)).toEqual(['r2']);
    });

    test('a publisher past its TTL is evicted on read', () => {
        const directory = new ClusterL4RouteDirectory(1000);

        directory.publish('node-a', [route('r1', 'node-a', 6001)], 1000);
        directory.publish('node-b', [route('r2', 'node-b', 6002)], 2500);

        // node-a last published at 1000, TTL 1000, read at 2500 → evicted
        expect(directory.routes(2500).map((entry) => entry.id)).toEqual(['r2']);
    });

    test('remove drops a publisher; clear empties the directory', () => {
        const directory = new ClusterL4RouteDirectory();

        directory.publish('node-a', [route('r1', 'node-a', 6001)], 1000);
        directory.publish('node-b', [route('r2', 'node-b', 6002)], 1000);

        expect(directory.remove('node-a')).toBe(true);
        expect(directory.routes(1500).map((entry) => entry.id)).toEqual(['r2']);

        directory.clear();
        expect(directory.routes(1500)).toHaveLength(0);
    });
});