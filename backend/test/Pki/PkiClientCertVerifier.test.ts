/**
 * Unit tests for the mTLS client-certificate verifier (own-PKI epic 9.4 — the
 * goal that replaces the shared registry secret). Verifies a real issued leaf
 * against the CA chain: valid cert yields its identity; expired, wrong-CA,
 * revoked and garbage inputs are rejected (never thrown). Network-free.
 */
import {
    PkiBootstrapTokenStore,
    PkiCaPurpose,
    PkiCaTree,
    PkiCaTreeResult,
    PkiCertificateBuilder,
    PkiClientCertVerifier,
    PkiEnrollmentService,
    PkiRevocationList
} from 'flyingfish_core';

/**
 * Generate a node key pair and a CSR for it.
 * @param commonName - the requested common name
 */
const makeCsr = async(commonName: string): Promise<string> => {
    const keys = await PkiCertificateBuilder.generateKeyPair();

    return PkiCertificateBuilder.createCsr(`CN=${commonName}`, keys);
};

const DAY_MS = 24 * 60 * 60 * 1000;

describe('PkiClientCertVerifier (v2, 9.4 mTLS)', () => {
    let tree: PkiCaTreeResult;
    let tokens: PkiBootstrapTokenStore;
    let service: PkiEnrollmentService;
    let leaf: string;
    let nodeUid: string;
    let caChain: string[];

    beforeAll(async() => {
        tree = await PkiCaTree.create({organization: 'FlyingFishTest'});
        tokens = new PkiBootstrapTokenStore();
        service = new PkiEnrollmentService(tree, tokens);

        const {token} = tokens.issue({purpose: PkiCaPurpose.service, autoApprove: true});
        const request = await service.enroll({
            csr: await makeCsr('svc-a'),
            bootstrapToken: token,
            commonName: 'svc-a'
        });

        leaf = request.issued!.certificate;
        nodeUid = request.nodeUid;
        caChain = service.getCaChain(PkiCaPurpose.service);
    });

    test('a valid client cert verifies and yields its identity', async() => {
        const identity = await PkiClientCertVerifier.verify(leaf, caChain);

        expect(identity).not.toBeNull();
        expect(identity?.purpose).toBe(PkiCaPurpose.service);
        expect(identity?.nodeUid).toBe(nodeUid);
    });

    test('a certificate outside its validity window is rejected', async() => {
        const wayPastExpiry = Date.now() + (3650 * DAY_MS);

        expect(await PkiClientCertVerifier.verify(leaf, caChain, {now: wayPastExpiry})).toBeNull();
    });

    test('a certificate that does not chain to the trusted CA is rejected', async() => {
        const otherTree = await PkiCaTree.create({organization: 'OtherOrg'});
        const otherChain = [
            otherTree.intermediates[PkiCaPurpose.service].certificate,
            otherTree.root.certificate
        ];

        expect(await PkiClientCertVerifier.verify(leaf, otherChain)).toBeNull();
    });

    test('a revoked identity is rejected', async() => {
        const revocation = new PkiRevocationList();
        revocation.revoke(nodeUid, 1000);

        expect(await PkiClientCertVerifier.verify(leaf, caChain, {revocationList: revocation})).toBeNull();
    });

    test('garbage input is rejected, not thrown', async() => {
        expect(await PkiClientCertVerifier.verify('not-a-certificate', caChain)).toBeNull();
    });

    test('the identity carries the purpose of the issuing intermediate', async() => {
        const {token} = tokens.issue({purpose: PkiCaPurpose.cluster, autoApprove: true});
        const request = await service.enroll({
            csr: await makeCsr('node-x'),
            bootstrapToken: token,
            commonName: 'node-x'
        });

        const identity = await PkiClientCertVerifier.verify(
            request.issued!.certificate,
            service.getCaChain(PkiCaPurpose.cluster)
        );

        expect(identity?.purpose).toBe(PkiCaPurpose.cluster);
    });
});