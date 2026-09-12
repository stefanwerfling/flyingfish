/**
 * Unit tests for the v2 PKI enrollment (roadmap 9.4.2, EST-style).
 *
 * Covers the CSR primitives (create + proof of possession), the bootstrap
 * token store (single-use + TTL, injectable clock) and the enrollment service
 * (auto-enroll issues immediately; admin-approve queues then issues; reject
 * blocks issuance). Issued leaves carry the assigned flyingfish://<purpose>/
 * <nodeUid> identity and chain to the Root. Network-free (Node WebCrypto).
 */
import * as x509 from '@peculiar/x509';
import {
    PkiBootstrapTokenStore,
    PkiCaPurpose,
    PkiCaTree,
    PkiCaTreeResult,
    PkiCertificateBuilder,
    PkiEnrollmentService,
    PkiEnrollmentStatus
} from 'flyingfish_core';

/**
 * Generate a node key pair and a CSR for it.
 * @param commonName - the requested common name
 */
const makeCsr = async(commonName: string): Promise<string> => {
    const keys = await PkiCertificateBuilder.generateKeyPair();

    return PkiCertificateBuilder.createCsr(`CN=${commonName}`, keys);
};

describe('PKI enrollment (v2, EST-style)', () => {
    let tree: PkiCaTreeResult;

    beforeAll(async() => {
        tree = await PkiCaTree.create({organization: 'FlyingFishTest'});
    });

    describe('CSR primitives', () => {
        test('a freshly created CSR verifies its proof of possession', async() => {
            const csr = await makeCsr('svc-a');

            expect(await PkiCertificateBuilder.verifyCsr(csr)).toBe(true);
            expect(PkiCertificateBuilder.getCsrSubject(csr)).toContain('CN=svc-a');
        });

        test('a CSR with a corrupted signature does not verify', async() => {
            const csr = await makeCsr('svc-b');
            const der = Buffer.from(csr.replace(/-----[^-]+-----/gu, '').replace(/\s+/gu, ''), 'base64');

            // Change the last signature byte so the CSR self-signature breaks.
            der[der.length - 1] = (der[der.length - 1] + 1) % 256;
            const lines = der.toString('base64').match(/.{1,64}/gu) ?? [];
            const tampered = `-----BEGIN CERTIFICATE REQUEST-----\n${lines.join('\n')}\n-----END CERTIFICATE REQUEST-----`;

            let ok: boolean;

            try {
                ok = await PkiCertificateBuilder.verifyCsr(tampered);
            } catch {
                ok = false;
            }

            expect(ok).toBe(false);
        });
    });

    describe('bootstrap token store', () => {
        test('a single-use token is valid once, then consumed', () => {
            const store = new PkiBootstrapTokenStore();
            const {token} = store.issue({purpose: PkiCaPurpose.service});

            expect(store.consume(token)?.purpose).toBe(PkiCaPurpose.service);
            expect(store.consume(token)).toBeNull();
        });

        test('a token past its TTL is rejected (injected clock)', () => {
            let now = 0;
            const store = new PkiBootstrapTokenStore(() => now);
            const {token} = store.issue({purpose: PkiCaPurpose.service, ttlMs: 1000});

            now = 500;
            expect(store.validate(token)).not.toBeNull();

            now = 1500;
            expect(store.validate(token)).toBeNull();
        });
    });

    describe('enrollment flows', () => {
        test('auto-enroll issues a certificate that chains to the Root', async() => {
            const store = new PkiBootstrapTokenStore();
            const service = new PkiEnrollmentService(tree, store);
            const {token} = store.issue({purpose: PkiCaPurpose.service, autoApprove: true});

            const csr = await makeCsr('nginx@node-1');
            const request = await service.enroll({csr: csr, bootstrapToken: token, commonName: 'nginx@node-1'});

            expect(request.status).toBe(PkiEnrollmentStatus.issued);
            expect(request.issued?.chain).toHaveLength(3);

            const cert = new x509.X509Certificate(request.issued!.certificate);
            const san = cert.getExtension(x509.SubjectAlternativeNameExtension);
            const sanValues = (san?.names.toJSON() ?? []).map((n) => n.value);

            expect(sanValues).toContain(`flyingfish://service/${request.nodeUid}`);
            expect(await PkiCertificateBuilder.verifyIssuedBy(
                request.issued!.certificate,
                tree.intermediates[PkiCaPurpose.service].certificate
            )).toBe(true);
        });

        test('an invalid or reused token is rejected', async() => {
            const store = new PkiBootstrapTokenStore();
            const service = new PkiEnrollmentService(tree, store);
            const {token} = store.issue({purpose: PkiCaPurpose.service, autoApprove: true});
            const csr = await makeCsr('svc-c');

            await expect(service.enroll({csr: csr, bootstrapToken: 'nope', commonName: 'svc-c'})).rejects.toThrow();

            // First use consumes the single-use token; the second must fail.
            await service.enroll({csr: csr, bootstrapToken: token, commonName: 'svc-c'});
            await expect(service.enroll({csr: csr, bootstrapToken: token, commonName: 'svc-c'})).rejects.toThrow();
        });

        test('admin-approve flow: enroll queues pending, approve issues', async() => {
            const store = new PkiBootstrapTokenStore();
            const service = new PkiEnrollmentService(tree, store);
            const {token} = store.issue({purpose: PkiCaPurpose.cluster, autoApprove: false});

            const csr = await makeCsr('node-x');
            const pending = await service.enroll({csr: csr, bootstrapToken: token, commonName: 'node-x'});

            expect(pending.status).toBe(PkiEnrollmentStatus.pending);
            expect(pending.issued).toBeUndefined();

            const issued = await service.approve(pending.id);

            expect(issued.status).toBe(PkiEnrollmentStatus.issued);
            expect(await PkiCertificateBuilder.verifyIssuedBy(
                issued.issued!.certificate,
                tree.intermediates[PkiCaPurpose.cluster].certificate
            )).toBe(true);
        });

        test('a rejected request cannot be approved', async() => {
            const store = new PkiBootstrapTokenStore();
            const service = new PkiEnrollmentService(tree, store);
            const {token} = store.issue({purpose: PkiCaPurpose.device, autoApprove: false});

            const csr = await makeCsr('dev-1');
            const pending = await service.enroll({csr: csr, bootstrapToken: token, commonName: 'dev-1'});

            expect(service.reject(pending.id).status).toBe(PkiEnrollmentStatus.rejected);
            await expect(service.approve(pending.id)).rejects.toThrow();
        });

        test('getCaChain returns [intermediate, root] for a purpose', () => {
            const service = new PkiEnrollmentService(tree, new PkiBootstrapTokenStore());
            const chain = service.getCaChain(PkiCaPurpose.service);

            expect(chain).toEqual([
                tree.intermediates[PkiCaPurpose.service].certificate,
                tree.root.certificate
            ]);
        });
    });
});