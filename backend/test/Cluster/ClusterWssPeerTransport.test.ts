/**
 * Unit tests for the WSS/443 cluster peer transport (Cluster/Mesh epic 9.5.1,
 * slice 3). Same contract as the TCP-TLS transport but carried over a WebSocket:
 * two in-process ClusterWssPeerTransport instances over localhost mutually
 * authenticate by their flyingfish://cluster/<nodeUid> cert identity, exchange
 * framed messages both ways, and a non-cluster (service-purpose) certificate is
 * refused admission. Network-free (loopback TLS only).
 */
import {
    ClusterPeerChannel,
    ClusterWssPeerTransport,
    PkiBootstrapTokenStore,
    PkiCaPurpose,
    PkiCaTree,
    PkiCaTreeResult,
    PkiCertificateBuilder,
    PkiEnrollmentService
} from 'flyingfish_core';

const SETTLE_MS = 300;

type TestNode = {nodeUid: string; certificate: string; privateKey: string;};

describe('ClusterWssPeerTransport (cluster/mesh 9.5.1)', () => {
    let tree: PkiCaTreeResult;
    let tokens: PkiBootstrapTokenStore;
    let service: PkiEnrollmentService;
    let caChain: string[];

    beforeAll(async() => {
        tree = await PkiCaTree.create({organization: 'FlyingFishTest'});
        tokens = new PkiBootstrapTokenStore();
        service = new PkiEnrollmentService(tree, tokens);
        caChain = service.getCaChain(PkiCaPurpose.cluster);
    });

    /**
     * Enroll a node under a CA purpose and return its identity + key.
     * @param purpose - the CA purpose
     * @param commonName - the node common name
     */
    const enrollNode = async(purpose: PkiCaPurpose, commonName: string): Promise<TestNode> => {
        const {token} = tokens.issue({purpose: purpose, autoApprove: true});
        const keys = await PkiCertificateBuilder.generateKeyPair();
        const csr = await PkiCertificateBuilder.createCsr(`CN=${commonName}`, keys);
        const request = await service.enroll({csr: csr, bootstrapToken: token, commonName: commonName});
        const pem = await PkiCertificateBuilder.exportKeyPair(keys);

        return {nodeUid: request.nodeUid, certificate: request.issued!.certificate, privateKey: pem.privateKey};
    };

    test('two cluster nodes mutually authenticate and exchange messages both ways over WSS', async() => {
        const nodeA = await enrollNode(PkiCaPurpose.cluster, 'wssNodeA');
        const nodeB = await enrollNode(PkiCaPurpose.cluster, 'wssNodeB');

        const transportA = new ClusterWssPeerTransport({certificate: nodeA.certificate, privateKey: nodeA.privateKey, caChain: caChain});
        const transportB = new ClusterWssPeerTransport({certificate: nodeB.certificate, privateKey: nodeB.privateKey, caChain: caChain});

        let resolveInbound: (channel: ClusterPeerChannel) => void = (): void => undefined;
        const inboundOnA = new Promise<ClusterPeerChannel>((resolve): void => {
            resolveInbound = resolve;
        });

        const port = await transportA.listen(0, (channel): void => resolveInbound(channel));
        const clientChannel = await transportB.connect('127.0.0.1', port);
        const serverChannel = await inboundOnA;

        // each side sees the OTHER's cluster identity
        expect(clientChannel.identity.nodeUid).toBe(nodeA.nodeUid);
        expect(clientChannel.identity.purpose).toBe(PkiCaPurpose.cluster);
        expect(serverChannel.identity.nodeUid).toBe(nodeB.nodeUid);

        // client (B) -> server (A)
        const gotOnA = new Promise<string>((resolve): void => {
            serverChannel.onMessage((message): void => resolve(Buffer.from(message).toString()));
        });
        clientChannel.send(Buffer.from('hello-from-B'));
        expect(await gotOnA).toBe('hello-from-B');

        // server (A) -> client (B)
        const gotOnB = new Promise<string>((resolve): void => {
            clientChannel.onMessage((message): void => resolve(Buffer.from(message).toString()));
        });
        serverChannel.send(Buffer.from('hello-from-A'));
        expect(await gotOnB).toBe('hello-from-A');

        clientChannel.close();
        await transportA.close();
        await transportB.close();
    });

    test('a non-cluster (service-purpose) certificate is refused admission over WSS', async() => {
        const nodeA = await enrollNode(PkiCaPurpose.cluster, 'wssNodeA2');
        const rogue = await enrollNode(PkiCaPurpose.service, 'wssSvc');

        const transportA = new ClusterWssPeerTransport({certificate: nodeA.certificate, privateKey: nodeA.privateKey, caChain: caChain});
        const rogueTransport = new ClusterWssPeerTransport({certificate: rogue.certificate, privateKey: rogue.privateKey, caChain: caChain});

        let admitted = 0;
        const port = await transportA.listen(0, (): void => {
            admitted += 1;
        });

        const rogueChannel = await rogueTransport.connect('127.0.0.1', port).catch((): null => null);
        await new Promise((resolve): void => {
            setTimeout(resolve, SETTLE_MS);
        });

        // the server never admits the service cert into the mesh
        expect(admitted).toBe(0);

        if (rogueChannel !== null) {
            rogueChannel.close();
        }

        await rogueTransport.close();
        await transportA.close();
    });
});