import * as fs from 'fs';
import path from 'path';
import {Logger} from '@stefanwerfling/figtree';
import {
    CaCertificateDB,
    EnrollmentRequestDB,
    IssuedCertificateDB,
    PkiCaNode,
    PkiCaPurpose,
    PkiCaTree,
    PkiCaTreeResult,
    PkiEnrollmentRequest,
    PkiEnrollmentStatus,
    PkiKeyAlgorithm
} from 'flyingfish_core';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * PkiStore — durable state for the PKI part container on top of the shared
 * database. It owns the CA-tree ceremony (create once, persist, reload on every
 * later boot) and mirrors the enrollment state machine into the
 * `enrollment_request` / `issued_certificate` tables.
 *
 * Note (9.4.6-D scope): the in-memory PkiEnrollmentService remains the runtime
 * authority for the pending queue within a process; the DB rows written here are
 * the durable record. Rehydrating pending requests back into the service after a
 * restart is a follow-up — auto-approve enrollment (the node path) completes in a
 * single request and is fully persisted. CA private keys are stored as PEM; the
 * design's encryption-at-rest / offline-root handling is a later concern.
 */
export class PkiStore {

    /**
     * map of CA purpose to the persisted ca_certificate id of its intermediate,
     * filled by loadOrCreate(); used to link issued certificates to their CA.
     */
    private readonly _caIdByPurpose: Map<PkiCaPurpose, number> = new Map();

    /**
     * the persisted ca_certificate id of the Root, used as parent_ca_id when a
     * rotated intermediate is added.
     */
    private _rootCaId: number = 0;

    /**
     * the CA tree's key algorithm, tracked so a rotated intermediate is persisted
     * with the same algorithm.
     */
    private _algorithm: PkiKeyAlgorithm = PkiKeyAlgorithm.ed25519;

    /**
     * Load the CA tree from the database, creating and persisting it on first
     * boot (the ceremony). Returns the in-memory tree the enrollment service
     * issues from.
     * @param organization - the O= for the distinguished names on first creation
     */
    public async loadOrCreate(organization: string): Promise<PkiCaTreeResult> {
        const rows = await CaCertificateDB.find();

        if (rows.length === 0) {
            Logger.getLogger().info('PkiStore: no CA tree found, running the CA ceremony ...');

            const tree = await PkiCaTree.create({organization: organization});

            await this._persistTree(tree);

            return tree;
        }

        Logger.getLogger().info('PkiStore: loading the existing CA tree from the database ...');

        return this._rebuildTree(rows);
    }

    /**
     * Persist a freshly-run CA-tree ceremony: the Root plus one row per purpose
     * Intermediate (linked to the Root by parent_ca_id).
     * @param tree - the built CA tree
     */
    private async _persistTree(tree: PkiCaTreeResult): Promise<void> {
        const now = Date.now();

        this._algorithm = tree.algorithm;

        const rootRow = new CaCertificateDB();
        rootRow.parent_ca_id = 0;
        rootRow.ca_type = 'root';
        rootRow.purpose = '';
        rootRow.subject = 'FlyingFish Root CA';
        rootRow.algorithm = tree.algorithm;
        rootRow.certificate = tree.root.certificate;
        rootRow.private_key = tree.root.privateKey;
        rootRow.public_key = tree.root.publicKey;
        rootRow.created_at = now;
        await rootRow.save();

        this._rootCaId = rootRow.id;

        // The purpose intermediates are independent of each other (all linked to
        // the already-saved Root), so persist them concurrently.
        await Promise.all(Object.values(PkiCaPurpose).map(async(purpose) => {
            const node = tree.intermediates[purpose];
            const row = new CaCertificateDB();
            row.parent_ca_id = rootRow.id;
            row.ca_type = 'intermediate';
            row.purpose = purpose;
            row.subject = `FlyingFish ${purpose} Intermediate CA`;
            row.algorithm = tree.algorithm;
            row.certificate = node.certificate;
            row.private_key = node.privateKey;
            row.public_key = node.publicKey;
            row.created_at = now;
            await row.save();

            this._caIdByPurpose.set(purpose, row.id);
        }));
    }

    /**
     * Rebuild the in-memory CA tree from persisted rows.
     * @param rows - all ca_certificate rows
     */
    private _rebuildTree(rows: CaCertificateDB[]): PkiCaTreeResult {
        const rootRow = rows.find((row) => row.ca_type === 'root');

        if (!rootRow) {
            throw new Error('PkiStore: ca_certificate has rows but no root CA');
        }

        this._rootCaId = rootRow.id;
        this._algorithm = rootRow.algorithm as PkiKeyAlgorithm;

        const intermediates = {} as Record<PkiCaPurpose, PkiCaNode>;

        for (const purpose of Object.values(PkiCaPurpose)) {
            // A rotated purpose can have several intermediate rows — pick the
            // newest (highest created_at) so the current intermediate is loaded.
            const purposeRows = rows.filter((entry) => entry.ca_type === 'intermediate' && entry.purpose === purpose);

            if (purposeRows.length === 0) {
                throw new Error(`PkiStore: no persisted intermediate CA for purpose ${purpose}`);
            }

            const row = purposeRows.reduce((newest, entry) => entry.created_at > newest.created_at ? entry : newest);

            intermediates[purpose] = {
                certificate: row.certificate,
                privateKey: row.private_key,
                publicKey: row.public_key
            };

            this._caIdByPurpose.set(purpose, row.id);
        }

        return {
            algorithm: rootRow.algorithm as PkiKeyAlgorithm,
            root: {
                certificate: rootRow.certificate,
                privateKey: rootRow.private_key,
                publicKey: rootRow.public_key
            },
            intermediates: intermediates
        };
    }

    /**
     * Persist a new enrollment request (pending or already issued via
     * auto-approve). Writes the enrollment_request row and, if the request is
     * already issued, the issued_certificate row linked back to it.
     * @param request - the enrollment request returned by the service
     */
    public async persistEnrollment(request: PkiEnrollmentRequest): Promise<void> {
        const row = new EnrollmentRequestDB();
        row.request_uid = request.id;
        row.status = request.status;
        row.purpose = request.purpose;
        row.node_uid = request.nodeUid;
        row.common_name = request.commonName;
        row.sans = JSON.stringify(request.sans);
        row.validity_days = request.validityDays;
        row.csr = request.csr;
        row.issued_certificate_id = 0;
        row.created_at = Date.now();
        await row.save();

        if (request.status === PkiEnrollmentStatus.issued && request.issued) {
            const issuedId = await this._persistIssued(request);
            row.issued_certificate_id = issuedId;
            await row.save();
        }
    }

    /**
     * Update a persisted enrollment request after an admin approve/reject. On
     * approval the issued_certificate row is written and linked.
     * @param request - the updated enrollment request
     */
    public async updateEnrollment(request: PkiEnrollmentRequest): Promise<void> {
        const row = await EnrollmentRequestDB.findOne({where: {request_uid: request.id}});

        if (!row) {
            // The request lives in the service but not the DB (e.g. created before
            // a restart). Persist it now so the durable record catches up.
            await this.persistEnrollment(request);
            return;
        }

        row.status = request.status;

        if (request.status === PkiEnrollmentStatus.issued && request.issued && row.issued_certificate_id === 0) {
            row.issued_certificate_id = await this._persistIssued(request);
        }

        await row.save();
    }

    /**
     * Write the issued_certificate row for an issued request and return its id.
     * @param request - the issued enrollment request (request.issued is set)
     */
    private async _persistIssued(request: PkiEnrollmentRequest): Promise<number> {
        const issued = request.issued!;
        const now = Date.now();

        const row = new IssuedCertificateDB();
        row.ca_id = this._caIdByPurpose.get(request.purpose) ?? 0;
        row.node_uid = issued.nodeUid;
        row.purpose = request.purpose;
        row.common_name = request.commonName;
        row.certificate = issued.certificate;
        row.chain = JSON.stringify(issued.chain);
        row.issued_at = now;
        row.expires_at = now + (request.validityDays * MS_PER_DAY);
        await row.save();

        return row.id;
    }

    /**
     * Persist a rotated intermediate CA as a NEW ca_certificate row (the old row
     * stays for overlap) and point subsequent issued-cert links at it (own-PKI
     * epic 9.4.3-E3). On the next boot _rebuildTree loads the newest per purpose.
     * @param node - the rolled intermediate node
     * @param purpose - its CA purpose
     */
    public async saveIntermediate(node: PkiCaNode, purpose: PkiCaPurpose): Promise<void> {
        const row = new CaCertificateDB();
        row.parent_ca_id = this._rootCaId;
        row.ca_type = 'intermediate';
        row.purpose = purpose;
        row.subject = `FlyingFish ${purpose} Intermediate CA`;
        row.algorithm = this._algorithm;
        row.certificate = node.certificate;
        row.private_key = node.privateKey;
        row.public_key = node.publicKey;
        row.created_at = Date.now();
        await row.save();

        this._caIdByPurpose.set(purpose, row.id);
    }

    /**
     * Write the CA pool (Root + intermediates) to a file for the Hub to read
     * (mTLS client CA). Called at boot and after a rotation.
     * @param pool - the CA certificate PEMs
     * @param filePath - the export file path
     */
    public async exportCaPool(pool: string[], filePath: string): Promise<void> {
        await fs.promises.mkdir(path.dirname(filePath), {recursive: true});
        await fs.promises.writeFile(filePath, JSON.stringify(pool));
    }

}