/**
 * Unit tests for the Hub trust state (own-PKI epic 9.4 mTLS + 9.4.4-D real-time
 * enforcement). Exercises the authenticate() decision via load() (no network):
 * a valid loaded cert yields its identity, a revoked identity is denied, and no
 * CA loaded means no authentication.
 */
import {
    PkiBootstrapTokenStore,
    PkiCaPurpose,
    PkiCaTree,
    PkiCaTreeResult,
    PkiCertificateBuilder,
    PkiEnrollmentService,
    PkiHubTrust
} from 'flyingfish_core';

describe('PkiHubTrust (v2, 9.4 mTLS / 9.4.4-D)', () => {
    let tree: PkiCaTreeResult;
    let service: PkiEnrollmentService;
    let leaf: string;
    let nodeUid: string;
    let caChain: string[];

    beforeAll(async() => {
        tree = await PkiCaTree.create({organization: 'FlyingFishTest'});
        const tokens = new PkiBootstrapTokenStore();
        service = new PkiEnrollmentService(tree, tokens);

        const {token} = tokens.issue({purpose: PkiCaPurpose.service, autoApprove: true});
        const keys = await PkiCertificateBuilder.generateKeyPair();
        const csr = await PkiCertificateBuilder.createCsr('CN=svc-a', keys);
        const request = await service.enroll({csr: csr, bootstrapToken: token, commonName: 'svc-a'});

        leaf = request.issued!.certificate;
        nodeUid = request.nodeUid;
        caChain = service.getCaChain(PkiCaPurpose.service);
    });

    test('authenticate accepts a valid loaded cert and yields its identity', async() => {
        const trust = new PkiHubTrust('http://pki:5334');
        trust.load(caChain, []);

        const identity = await trust.authenticate(leaf);

        expect(identity?.nodeUid).toBe(nodeUid);
        expect(identity?.purpose).toBe(PkiCaPurpose.service);
    });

    test('authenticate rejects when no CA chain is loaded', async() => {
        expect(await new PkiHubTrust('http://pki:5334').authenticate(leaf)).toBeNull();
    });

    test('authenticate denies a revoked identity (real-time Hub enforcement)', async() => {
        const trust = new PkiHubTrust('http://pki:5334');
        trust.load(caChain, [{nodeUid: nodeUid, revokedAt: 1000}]);

        expect(await trust.authenticate(leaf)).toBeNull();
    });

    test('authenticate denies via the CRL fallback even with an empty allowlist (9.4.4-E)', async() => {
        const crl = await service.signCrl(PkiCaPurpose.service, [{certificate: leaf, revocationDate: new Date(Date.UTC(2026, 0, 2))}]);
        const trust = new PkiHubTrust('http://pki:5334');
        trust.load(caChain, []);
        trust.loadCrl(PkiCaPurpose.service, crl);

        expect(await trust.authenticate(leaf)).toBeNull();
    });

    test('authenticate still accepts when the CRL does not list the cert', async() => {
        const crl = await service.signCrl(PkiCaPurpose.service, []);
        const trust = new PkiHubTrust('http://pki:5334');
        trust.load(caChain, []);
        trust.loadCrl(PkiCaPurpose.service, crl);

        expect((await trust.authenticate(leaf))?.nodeUid).toBe(nodeUid);
    });
});