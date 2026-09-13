/**
 * Integration test for the PKI persistence layer (own-PKI epic 9.4, slice
 * 9.4.6-F). Mirrors the registry API integration test's style — a real MariaDB
 * via the dbHarness — but exercises the data flow the PKI part container performs:
 * the AddPkiTables migration builds the tables, the CA-tree ceremony round-trips
 * through the self-referenced ca_certificate rows, and an auto-approve enrollment
 * issues a chain that is persisted as issued_certificate + enrollment_request.
 *
 * The HTTP surface (pkiserver's /pki/* routes) is validated end-to-end by the
 * compose smoke; this covers the entities + migration + enrollment service that
 * back them. Runs against a real MariaDB in the dedicated CI integration job.
 */
import {
    CaCertificateDB,
    EnrollmentRequestDB,
    IssuedCertificateDB,
    PkiBootstrapTokenStore,
    PkiCaPurpose,
    PkiCaTree,
    PkiCaTreeResult,
    PkiCertificateBuilder,
    PkiEnrollmentStatus,
    PkiEnrollmentService
} from 'flyingfish_core';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

/**
 * Persist a built CA tree the way the container's PkiStore does: the Root plus
 * one row per purpose Intermediate, linked by parent_ca_id. Returns the Root id.
 * @param tree - the built CA tree
 */
const persistTree = async(tree: PkiCaTreeResult): Promise<number> => {
    const root = new CaCertificateDB();
    root.parent_ca_id = 0;
    root.ca_type = 'root';
    root.purpose = '';
    root.subject = 'FlyingFish Root CA';
    root.algorithm = tree.algorithm;
    root.certificate = tree.root.certificate;
    root.private_key = tree.root.privateKey;
    root.public_key = tree.root.publicKey;
    root.created_at = 0;
    await root.save();

    await Promise.all(Object.values(PkiCaPurpose).map(async(purpose) => {
        const node = tree.intermediates[purpose];
        const row = new CaCertificateDB();
        row.parent_ca_id = root.id;
        row.ca_type = 'intermediate';
        row.purpose = purpose;
        row.subject = `FlyingFish ${purpose} Intermediate CA`;
        row.algorithm = tree.algorithm;
        row.certificate = node.certificate;
        row.private_key = node.privateKey;
        row.public_key = node.publicKey;
        row.created_at = 0;
        await row.save();
    }));

    return root.id;
};

describe('PKI enrollment persistence (integration)', () => {
    beforeAll(initTestDb);
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('the CA tree persists and reloads with the self-referenced parent linkage', async() => {
        const tree = await PkiCaTree.create({organization: 'FlyingFishITest'});
        const rootId = await persistTree(tree);

        const rows = await CaCertificateDB.find();

        expect(rows).toHaveLength(4);

        const rootRows = rows.filter((row) => row.ca_type === 'root');
        const intermediates = rows.filter((row) => row.ca_type === 'intermediate');

        expect(rootRows).toHaveLength(1);
        expect(rootRows[0].id).toBe(rootId);
        expect(rootRows[0].parent_ca_id).toBe(0);
        expect(intermediates).toHaveLength(3);

        // every intermediate points back at the Root (the tree edge)
        for (const intermediate of intermediates) {
            expect(intermediate.parent_ca_id).toBe(rootId);
        }

        // the three purposes are present exactly once each
        expect(intermediates.map((row) => row.purpose).sort()).toEqual(
            Object.values(PkiCaPurpose).slice().sort()
        );
    });

    test('an auto-approve enrollment issues a chain and persists issued + request rows', async() => {
        const tree = await PkiCaTree.create({organization: 'FlyingFishITest'});
        await persistTree(tree);

        const tokens = new PkiBootstrapTokenStore();
        const service = new PkiEnrollmentService(tree, tokens);
        const {token} = tokens.issue({purpose: PkiCaPurpose.service, autoApprove: true});

        const keys = await PkiCertificateBuilder.generateKeyPair();
        const csr = await PkiCertificateBuilder.createCsr('CN=nginx@node-1', keys);

        const request = await service.enroll({
            csr: csr,
            bootstrapToken: token,
            commonName: 'nginx@node-1'
        });

        expect(request.status).toBe(PkiEnrollmentStatus.issued);
        expect(request.issued?.chain).toHaveLength(3);

        // persist like the container's PkiStore
        const issued = new IssuedCertificateDB();
        issued.ca_id = 0;
        issued.node_uid = request.nodeUid;
        issued.purpose = request.purpose;
        issued.common_name = request.commonName;
        issued.certificate = request.issued!.certificate;
        issued.chain = JSON.stringify(request.issued!.chain);
        issued.issued_at = 0;
        issued.expires_at = 0;
        await issued.save();

        const enrollment = new EnrollmentRequestDB();
        enrollment.request_uid = request.id;
        enrollment.status = request.status;
        enrollment.purpose = request.purpose;
        enrollment.node_uid = request.nodeUid;
        enrollment.common_name = request.commonName;
        enrollment.sans = JSON.stringify(request.sans);
        enrollment.validity_days = request.validityDays;
        enrollment.csr = request.csr;
        enrollment.issued_certificate_id = issued.id;
        enrollment.created_at = 0;
        await enrollment.save();

        const foundIssued = await IssuedCertificateDB.findOne({where: {node_uid: request.nodeUid}});

        expect(foundIssued).not.toBeNull();
        expect(foundIssued?.purpose).toBe('service');
        expect(JSON.parse(foundIssued!.chain)).toHaveLength(3);

        const foundRequest = await EnrollmentRequestDB.findOne({where: {request_uid: request.id}});

        expect(foundRequest?.status).toBe('issued');
        expect(foundRequest?.issued_certificate_id).toBe(issued.id);
    });
});