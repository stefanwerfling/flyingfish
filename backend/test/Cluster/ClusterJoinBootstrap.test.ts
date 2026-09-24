/**
 * End-to-end test for the one-port cross-Hub join (Cluster/Mesh epic 9.5.12.2,
 * model (b)). Two nodes with SEPARATE CAs (two independent PkiCaTrees) — neither
 * trusts the other, exactly the federated-Hub situation. Node B seed-dials node A
 * with a join token + A's CA pin; the bootstrap pre-flight exchanges CA chains over
 * A's mesh port (no second port), each side adds the other's CA to its trust set,
 * and the next normal dial forms a real mutually-authenticated mesh channel. Real
 * loopback TLS + real crypto, network-free.
 */
import {
    caChainRootFingerprint,
    ClusterMembership,
    ClusterPeerInfo,
    ClusterPeerRoster,
    ClusterPeerTransportOptions,
    ClusterTlsPeerTransport,
    ClusterWssPeerTransport,
    IClusterPeerTransport,
    PkiBootstrapTokenStore,
    PkiCaPurpose,
    PkiCaTree,
    PkiCertificateBuilder,
    PkiEnrollmentService
} from 'flyingfish_core';

type TransportFactory = (options: ClusterPeerTransportOptions) => IClusterPeerTransport;

const TRANSPORTS: [string, TransportFactory][] = [
    ['TLS', (options): IClusterPeerTransport => new ClusterTlsPeerTransport(options)],
    ['WSS', (options): IClusterPeerTransport => new ClusterWssPeerTransport(options)]
];

const POLL_TIMEOUT_MS = 3000;
const POLL_INTERVAL_MS = 25;
const JOIN_TOKEN = 'JOIN-TOKEN-OK';

const emptyRoster: ClusterPeerRoster = {
    list: async(): Promise<ClusterPeerInfo[]> => []
};

type JoinNode = {
    nodeUid: string;
    membership: ClusterMembership;
    host: string;
    port: number;
    ownChain: string[];
    bootstrapTrust: string[];
};

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

/**
 * Build a node under its OWN CA (its own PkiCaTree), with a mesh transport whose
 * trust set is its own chain plus a mutable bootstrap-trust array, and an accept-side
 * bootstrap that admits a valid join token.
 * @param name - the node common name
 */
const makeNode = async(name: string, createTransport: TransportFactory): Promise<JoinNode> => {
    const tree = await PkiCaTree.create({organization: `FF-${name}`});
    const service = new PkiEnrollmentService(tree, new PkiBootstrapTokenStore());
    const tokens = new PkiBootstrapTokenStore();
    const enrollService = new PkiEnrollmentService(tree, tokens);
    const {token} = tokens.issue({purpose: PkiCaPurpose.cluster, autoApprove: true});
    const keys = await PkiCertificateBuilder.generateKeyPair();
    const csr = await PkiCertificateBuilder.createCsr(`CN=${name}`, keys);
    const request = await enrollService.enroll({csr: csr, bootstrapToken: token, commonName: name});
    const pem = await PkiCertificateBuilder.exportKeyPair(keys);
    const ownChain = service.getCaChain(PkiCaPurpose.cluster);
    const bootstrapTrust: string[] = [];

    const transport = createTransport({
        certificate: request.issued!.certificate,
        privateKey: pem.privateKey,
        caChain: ownChain,
        trustProvider: (): string[] => [...ownChain, ...bootstrapTrust],
        bootstrap: {
            ownCaChain: ownChain,
            validateToken: (presented: string): boolean => presented === JOIN_TOKEN,
            onAcceptedCa: (chain: string[]): void => {
                bootstrapTrust.push(...chain);
            }
        }
    });

    const membership = new ClusterMembership(transport, request.nodeUid);
    const port = await membership.start(0);

    return {nodeUid: request.nodeUid, membership: membership, host: '127.0.0.1', port: port, ownChain: ownChain, bootstrapTrust: bootstrapTrust};
};

describe.each(TRANSPORTS)('one-port cross-Hub join bootstrap over %s (cluster/mesh 9.5.12.2 model b)', (label, createTransport) => {
    let nodeA: JoinNode;
    let nodeB: JoinNode;

    beforeAll(async() => {
        nodeA = await makeNode(`node-a-${label}`, createTransport);
        nodeB = await makeNode(`node-b-${label}`, createTransport);
    });

    afterAll(async() => {
        await Promise.all([nodeA.membership.stop(), nodeB.membership.stop()]);
    });

    test('a valid join token bootstraps mutual trust, then the mesh channel forms', async() => {
        // sanity: separate CAs — neither trusts the other yet
        expect(nodeA.bootstrapTrust).toHaveLength(0);
        expect(nodeB.bootstrapTrust).toHaveLength(0);

        nodeB.membership.addSeedPeer(nodeA.host, nodeA.port, {
            token: JOIN_TOKEN,
            pinFingerprint: caChainRootFingerprint(nodeA.ownChain),
            ownCaChain: nodeB.ownChain,
            onAcceptedCa: (chain: string[]): void => {
                nodeB.bootstrapTrust.push(...chain);
            }
        });

        // first sync: the bootstrap pre-flight exchanges + pins CAs (no mesh channel yet)
        await nodeB.membership.sync(emptyRoster);

        await waitFor((): boolean => nodeA.bootstrapTrust.length > 0 && nodeB.bootstrapTrust.length > 0);
        expect(nodeB.membership.peers()).toHaveLength(0);

        // second sync: now both trust the other's CA, the normal dial forms the channel
        await nodeB.membership.sync(emptyRoster);

        await waitFor((): boolean =>
            nodeB.membership.peers().includes(nodeA.nodeUid) && nodeA.membership.peers().includes(nodeB.nodeUid));

        expect(nodeB.membership.peers()).toContain(nodeA.nodeUid);
        expect(nodeA.membership.peers()).toContain(nodeB.nodeUid);
    });
});

describe('one-port join bootstrap rejects an invalid token (cluster/mesh 9.5.12.2)', () => {
    let nodeA: JoinNode;
    let nodeB: JoinNode;

    beforeAll(async() => {
        nodeA = await makeNode('reject-a', TRANSPORTS[0][1]);
        nodeB = await makeNode('reject-b', TRANSPORTS[0][1]);
    });

    afterAll(async() => {
        await Promise.all([nodeA.membership.stop(), nodeB.membership.stop()]);
    });

    test('a wrong token leaves A distrusting B — B never enters A\'s cluster', async() => {
        nodeB.membership.addSeedPeer(nodeA.host, nodeA.port, {
            token: 'WRONG-TOKEN',
            pinFingerprint: caChainRootFingerprint(nodeA.ownChain),
            ownCaChain: nodeB.ownChain,
            onAcceptedCa: (chain: string[]): void => {
                nodeB.bootstrapTrust.push(...chain);
            }
        });

        await nodeB.membership.sync(emptyRoster);
        await nodeB.membership.sync(emptyRoster);

        await new Promise((resolve): void => {
            setTimeout(resolve, 200);
        });

        // The security guarantee: A never trusts B's CA and never admits it as a peer,
        // so B cannot enter A's cluster with an invalid token. (B legitimately pinned
        // A's public CA, so B may briefly hold a one-sided connection that A tears down;
        // that is harmless — A neither trusts nor gossips to B.)
        expect(nodeA.bootstrapTrust).toHaveLength(0);
        expect(nodeA.membership.peers()).toHaveLength(0);
    });
});
