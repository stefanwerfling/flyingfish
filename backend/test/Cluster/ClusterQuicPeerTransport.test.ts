/**
 * Unit tests for the QUIC cluster peer transport's JS layer (Cluster/Mesh epic
 * 9.5.1, step 1). The native QUIC addon is faked, so these run in the normal
 * network-free baseline; a REAL two-node QUIC handshake is exercised separately in
 * clusterquic/test. Covered here: the QuicStreamDuplex read/write pump, and that
 * ClusterQuicPeerTransport runs the shared ClusterPeerAuthenticator on the peer
 * certificate the native layer surfaces — admitting a real cluster cert (connect +
 * accept) and refusing a service-purpose cert.
 */
import {
    ClusterQuicPeerTransport,
    PkiBootstrapTokenStore,
    PkiCaPurpose,
    PkiCaTree,
    PkiCaTreeResult,
    PkiCertificateBuilder,
    PkiEnrollmentService,
    QuicNativeBinding,
    QuicNativePeer,
    QuicNativeTransport,
    QuicStreamDuplex
} from 'flyingfish_core';

const POLL_TIMEOUT_MS = 2000;
const POLL_INTERVAL_MS = 10;

type FakePeer = QuicNativePeer & {sent: Buffer[]; closed: boolean;};

/**
 * A fake native QUIC peer: `recv` replays a scripted list of chunks (null = stream
 * end), `send` records what was written, `close` flips a flag.
 */
const fakePeer = (peerCertPem: string, chunks: (Buffer | null)[] = [null]): FakePeer => {
    let index = 0;

    const peer: FakePeer = {
        peerCertPem: peerCertPem,
        sent: [],
        closed: false,
        recv: (): Promise<Buffer | null> => Promise.resolve(index < chunks.length ? chunks[index++] : null),
        send: (data: Buffer): Promise<void> => {
            peer.sent.push(Buffer.from(data));

            return Promise.resolve();
        },
        close: (): void => {
            peer.closed = true;
        }
    };

    return peer;
};

/**
 * The single fake native transport, driven by static config the tests set.
 */
class FakeQuicTransport implements QuicNativeTransport {

    public static connectPeer: QuicNativePeer | null = null;

    public static acceptQueue: QuicNativePeer[] = [];

    private _acceptIndex = 0;

    public async listen(port: number): Promise<number> {
        return port === 0 ? 12345 : port;
    }

    public async acceptPeer(): Promise<QuicNativePeer> {
        if (this._acceptIndex < FakeQuicTransport.acceptQueue.length) {
            return FakeQuicTransport.acceptQueue[this._acceptIndex++];
        }

        throw new Error('endpoint closed');
    }

    public async connect(_host: string, _port: number): Promise<QuicNativePeer> {
        if (FakeQuicTransport.connectPeer === null) {
            throw new Error('no peer configured');
        }

        return FakeQuicTransport.connectPeer;
    }

    public close(): Promise<void> {
        return Promise.resolve();
    }

}

const binding: QuicNativeBinding = {QuicTransport: FakeQuicTransport};

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

describe('QuicStreamDuplex', () => {
    test('pumps recv chunks to onData and fires onClose at stream end', async() => {
        const peer = fakePeer('unused', [Buffer.from('alpha'), Buffer.from('beta'), null]);
        const duplex = new QuicStreamDuplex(peer);

        const received: string[] = [];
        let closed = false;
        duplex.onData((chunk): void => {
            received.push(Buffer.from(chunk).toString());
        });
        duplex.onClose((): void => {
            closed = true;
        });

        await waitFor((): boolean => closed);

        expect(received).toEqual(['alpha', 'beta']);
    });

    test('write forwards to the native peer send', () => {
        const peer = fakePeer('unused');
        const duplex = new QuicStreamDuplex(peer);

        duplex.write(Buffer.from('payload'));

        expect(peer.sent).toHaveLength(1);
        expect(peer.sent[0].toString()).toBe('payload');
    });
});

describe('ClusterQuicPeerTransport (JS layer over a fake native binding)', () => {
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

    beforeEach(() => {
        FakeQuicTransport.connectPeer = null;
        FakeQuicTransport.acceptQueue = [];
    });

    /**
     * Enroll a node under a CA purpose and return its leaf certificate (PEM).
     * @param purpose - the CA purpose
     * @param commonName - the node common name
     */
    const enrollCert = async(purpose: PkiCaPurpose, commonName: string): Promise<{nodeUid: string; certPem: string;}> => {
        const {token} = tokens.issue({purpose: purpose, autoApprove: true});
        const keys = await PkiCertificateBuilder.generateKeyPair();
        const csr = await PkiCertificateBuilder.createCsr(`CN=${commonName}`, keys);
        const request = await service.enroll({csr: csr, bootstrapToken: token, commonName: commonName});

        return {nodeUid: request.nodeUid, certPem: request.issued!.certificate};
    };

    const options = (certificate: string, privateKey: string): {certificate: string; privateKey: string; caChain: string[];} => {
        return {certificate: certificate, privateKey: privateKey, caChain: caChain};
    };

    test('connect admits a peer presenting a valid cluster certificate', async() => {
        const peerCert = await enrollCert(PkiCaPurpose.cluster, 'quic-peer');
        FakeQuicTransport.connectPeer = fakePeer(peerCert.certPem);

        const transport = new ClusterQuicPeerTransport(options('cert', 'key'), binding);
        const channel = await transport.connect('127.0.0.1', 5336);

        expect(channel.identity.nodeUid).toBe(peerCert.nodeUid);
        expect(channel.identity.purpose).toBe(PkiCaPurpose.cluster);

        await transport.close();
    });

    test('connect refuses a peer presenting a service-purpose certificate', async() => {
        const rogueCert = await enrollCert(PkiCaPurpose.service, 'quic-svc');
        const rogue = fakePeer(rogueCert.certPem);
        FakeQuicTransport.connectPeer = rogue;

        const transport = new ClusterQuicPeerTransport(options('cert', 'key'), binding);

        await expect(transport.connect('127.0.0.1', 5336)).rejects.toThrow('not trusted');
        expect(rogue.closed).toBe(true);

        await transport.close();
    });

    test('listen admits an inbound cluster peer via the accept loop', async() => {
        const peerCert = await enrollCert(PkiCaPurpose.cluster, 'quic-inbound');
        FakeQuicTransport.acceptQueue = [fakePeer(peerCert.certPem)];

        const transport = new ClusterQuicPeerTransport(options('cert', 'key'), binding);

        const admitted: string[] = [];
        const port = await transport.listen(0, (channel): void => {
            admitted.push(channel.identity.nodeUid);
        });

        expect(port).toBe(12345);
        await waitFor((): boolean => admitted.length === 1);
        expect(admitted[0]).toBe(peerCert.nodeUid);

        await transport.close();
    });
});