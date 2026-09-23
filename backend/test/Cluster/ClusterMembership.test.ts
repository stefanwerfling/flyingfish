/**
 * Unit tests for cluster peer discovery (Cluster/Mesh epic 9.5.1). Three real
 * in-process nodes, each with its own transport + membership and a shared roster
 * listing all three endpoints: after each syncs, every node is connected to the
 * other two — exactly one channel per pair (the lower-nodeUid side accepts, the
 * higher dials), so no double connections. Network-free (loopback TLS only).
 */
import {
    ClusterMembership,
    ClusterPeerInfo,
    ClusterPeerRoster,
    ClusterTlsPeerTransport,
    PkiBootstrapTokenStore,
    PkiCaPurpose,
    PkiCaTree,
    PkiCaTreeResult,
    PkiCertificateBuilder,
    PkiEnrollmentService
} from 'flyingfish_core';

const POLL_TIMEOUT_MS = 3000;
const POLL_INTERVAL_MS = 25;

type TestNode = {nodeUid: string; membership: ClusterMembership; info: ClusterPeerInfo;};

/**
 * Resolve once `check` is true or reject after the timeout.
 * @param check - the condition
 */
const waitFor = async(check: () => boolean): Promise<void> => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (!check()) {
        if (Date.now() > deadline) {
            throw new Error('waitFor: timed out');
        }

        // eslint-disable-next-line no-await-in-loop -- sequential poll
        await new Promise((resolve): void => {
            setTimeout(resolve, POLL_INTERVAL_MS);
        });
    }
};

describe('ClusterMembership peer discovery (cluster/mesh 9.5.1)', () => {
    let tree: PkiCaTreeResult;
    let tokens: PkiBootstrapTokenStore;
    let service: PkiEnrollmentService;
    let caChain: string[];
    let nodes: TestNode[];

    beforeAll(async() => {
        tree = await PkiCaTree.create({organization: 'FlyingFishTest'});
        tokens = new PkiBootstrapTokenStore();
        service = new PkiEnrollmentService(tree, tokens);
        caChain = service.getCaChain(PkiCaPurpose.cluster);

        nodes = [];

        for (const name of ['alpha', 'beta', 'gamma']) {
            const {token} = tokens.issue({purpose: PkiCaPurpose.cluster, autoApprove: true});
            // eslint-disable-next-line no-await-in-loop -- sequential setup
            const keys = await PkiCertificateBuilder.generateKeyPair();
            // eslint-disable-next-line no-await-in-loop -- sequential setup
            const csr = await PkiCertificateBuilder.createCsr(`CN=${name}`, keys);
            // eslint-disable-next-line no-await-in-loop -- sequential setup
            const request = await service.enroll({csr: csr, bootstrapToken: token, commonName: name});
            // eslint-disable-next-line no-await-in-loop -- sequential setup
            const pem = await PkiCertificateBuilder.exportKeyPair(keys);

            const transport = new ClusterTlsPeerTransport({
                certificate: request.issued!.certificate,
                privateKey: pem.privateKey,
                caChain: caChain
            });
            const membership = new ClusterMembership(transport, request.nodeUid);
            // eslint-disable-next-line no-await-in-loop -- sequential setup
            const port = await membership.start(0);

            nodes.push({nodeUid: request.nodeUid, membership: membership, info: {nodeUid: request.nodeUid, host: '127.0.0.1', port: port}});
        }
    });

    afterAll(async() => {
        await Promise.all(nodes.map(async(node): Promise<void> => node.membership.stop()));
    });

    test('every node discovers and connects to the other two (one channel per pair)', async() => {
        const roster: ClusterPeerRoster = {
            list: async(): Promise<ClusterPeerInfo[]> => nodes.map((node) => node.info)
        };

        await Promise.all(nodes.map(async(node): Promise<void> => node.membership.sync(roster)));

        // wait for the accepting sides' inbound peers to settle
        await waitFor((): boolean => nodes.every((node) => node.membership.peers().length === 2));

        for (const node of nodes) {
            const expected = nodes.filter((other) => other.nodeUid !== node.nodeUid).map((other) => other.nodeUid).sort();
            expect(node.membership.peers().sort()).toEqual(expected);
        }
    });
});

describe('ClusterMembership seed-peer bootstrap (cross-Hub join 9.5.12.2)', () => {
    let tree: PkiCaTreeResult;
    let tokens: PkiBootstrapTokenStore;
    let service: PkiEnrollmentService;
    let caChain: string[];
    let nodes: TestNode[];

    beforeAll(async() => {
        tree = await PkiCaTree.create({organization: 'FlyingFishTestSeed'});
        tokens = new PkiBootstrapTokenStore();
        service = new PkiEnrollmentService(tree, tokens);
        caChain = service.getCaChain(PkiCaPurpose.cluster);

        nodes = [];

        for (const name of ['seed-a', 'seed-b']) {
            const {token} = tokens.issue({purpose: PkiCaPurpose.cluster, autoApprove: true});
            // eslint-disable-next-line no-await-in-loop -- sequential setup
            const keys = await PkiCertificateBuilder.generateKeyPair();
            // eslint-disable-next-line no-await-in-loop -- sequential setup
            const csr = await PkiCertificateBuilder.createCsr(`CN=${name}`, keys);
            // eslint-disable-next-line no-await-in-loop -- sequential setup
            const request = await service.enroll({csr: csr, bootstrapToken: token, commonName: name});
            // eslint-disable-next-line no-await-in-loop -- sequential setup
            const pem = await PkiCertificateBuilder.exportKeyPair(keys);

            const transport = new ClusterTlsPeerTransport({
                certificate: request.issued!.certificate,
                privateKey: pem.privateKey,
                caChain: caChain
            });
            const membership = new ClusterMembership(transport, request.nodeUid);
            // eslint-disable-next-line no-await-in-loop -- sequential setup
            const port = await membership.start(0);

            nodes.push({nodeUid: request.nodeUid, membership: membership, info: {nodeUid: request.nodeUid, host: '127.0.0.1', port: port}});
        }
    });

    afterAll(async() => {
        await Promise.all(nodes.map(async(node): Promise<void> => node.membership.stop()));
    });

    test('a seed peer connects two nodes that share no roster (bootstrap, ordering bypassed)', async() => {
        // The empty roster models two SEPARATE Hubs: neither node discovers the other
        // through a shared roster. The join package hands node B node A's mesh endpoint,
        // which B registers as a seed and dials unconditionally.
        const emptyRoster: ClusterPeerRoster = {
            list: async(): Promise<ClusterPeerInfo[]> => []
        };

        const nodeA = nodes[0];
        const nodeB = nodes[1];

        nodeB.membership.addSeedPeer(nodeA.info.host, nodeA.info.port);
        await nodeB.membership.sync(emptyRoster);

        await waitFor((): boolean =>
            nodeB.membership.peers().includes(nodeA.nodeUid) && nodeA.membership.peers().includes(nodeB.nodeUid));

        expect(nodeB.membership.peers()).toContain(nodeA.nodeUid);
        expect(nodeA.membership.peers()).toContain(nodeB.nodeUid);
    });
});