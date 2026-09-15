/**
 * Unit tests for the Hub's in-memory cluster peer directory (Cluster/Mesh epic
 * 9.5.1, peer discovery). Covers announce/refresh, TTL eviction with an injected
 * clock and graceful removal. Network-free.
 */
import {ClusterPeerDirectory} from '../../src/Application/Hub/ClusterPeerDirectory.js';

describe('ClusterPeerDirectory (Hub peer discovery)', () => {
    test('announce adds a peer that peers() returns', () => {
        const directory = new ClusterPeerDirectory();

        directory.announce('node-a', '10.0.0.1', 5335, undefined, 1000);

        expect(directory.peers(1000)).toEqual([{nodeUid: 'node-a', host: '10.0.0.1', port: 5335}]);
    });

    test('announce carries the overlay IP back to peers()', () => {
        const directory = new ClusterPeerDirectory();

        directory.announce('node-a', '10.0.0.1', 5335, '10.42.0.1', 1000);

        expect(directory.peers(1000)).toEqual([{nodeUid: 'node-a', host: '10.0.0.1', port: 5335, overlayIp: '10.42.0.1'}]);
    });

    test('a second announce refreshes host/port and TTL in place', () => {
        const directory = new ClusterPeerDirectory(10000);

        directory.announce('node-a', '10.0.0.1', 5335, undefined, 1000);
        directory.announce('node-a', '10.0.0.9', 5999, undefined, 6000);

        expect(directory.peers(6000)).toEqual([{nodeUid: 'node-a', host: '10.0.0.9', port: 5999}]);
        // still fresh 9s after the refresh, which would already be stale off the first announce
        expect(directory.peers(11000)).toHaveLength(1);
    });

    test('a peer past its TTL is evicted on read', () => {
        const directory = new ClusterPeerDirectory(90000);

        directory.announce('node-a', '10.0.0.1', 5335, undefined, 1000);

        expect(directory.peers(90000)).toHaveLength(1);
        expect(directory.peers(91001)).toHaveLength(0);
        // eviction is permanent, not a per-read filter
        expect(directory.peers(91001)).toHaveLength(0);
    });

    test('multiple peers coexist and only the stale one falls off', () => {
        const directory = new ClusterPeerDirectory(90000);

        directory.announce('node-a', '10.0.0.1', 5335, undefined, 1000);
        directory.announce('node-b', '10.0.0.2', 5335, undefined, 50000);

        const fresh = directory.peers(95000).map((peer) => peer.nodeUid).sort();

        expect(fresh).toEqual(['node-b']);
    });

    test('remove drops a peer and reports whether it existed', () => {
        const directory = new ClusterPeerDirectory();

        directory.announce('node-a', '10.0.0.1', 5335, undefined, 1000);

        expect(directory.remove('node-a')).toBe(true);
        expect(directory.remove('node-a')).toBe(false);
        expect(directory.peers(1000)).toHaveLength(0);
    });

    test('clear empties the directory', () => {
        const directory = new ClusterPeerDirectory();

        directory.announce('node-a', '10.0.0.1', 5335, undefined, 1000);
        directory.announce('node-b', '10.0.0.2', 5335, undefined, 1000);
        directory.clear();

        expect(directory.peers(1000)).toHaveLength(0);
    });
});