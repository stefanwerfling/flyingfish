/**
 * Unit tests for the node auto-renew driver (roadmap 9.4.3-D). Exercises the
 * ensure() flow end to end against a real on-disk PkiNodeFileStore (temp dir) and
 * a transport backed by an in-process PkiEnrollmentService: first boot enrolls
 * and persists, a later boot before 2/3 reuses the stored identity, and once due
 * it renews (rotating the key, keeping the nodeUid). Network-free.
 */
import * as fs from 'fs';
import os from 'os';
import path from 'path';
import {
    PkiBootstrapTokenStore,
    PkiCaPurpose,
    PkiCaTree,
    PkiCaTreeResult,
    PkiEnrollmentService,
    PkiNodeClient,
    PkiNodeEnroller,
    PkiNodeEnrollResult,
    PkiNodeFileStore,
    PkiNodeTransport
} from 'flyingfish_core';

/**
 * A transport backed by an in-process enrollment service (no network).
 * @param service - the enrollment service to route through
 */
const makeTransport = (service: PkiEnrollmentService): PkiNodeTransport => {
    return {
        enroll: async(request): Promise<PkiNodeEnrollResult> => {
            const issued = await service.enroll({
                csr: request.csr,
                bootstrapToken: request.bootstrapToken,
                commonName: request.commonName
            });

            return {
                nodeUid: issued.nodeUid,
                certificate: issued.issued!.certificate,
                chain: issued.issued!.chain
            };
        },
        renew: async(request): Promise<PkiNodeEnrollResult> => {
            const issued = await service.renew({
                nodeUid: request.nodeUid,
                purpose: request.purpose,
                csr: request.csr,
                commonName: request.commonName
            });

            return {
                nodeUid: issued.nodeUid,
                certificate: issued.issued!.certificate,
                chain: issued.issued!.chain
            };
        }
    };
};

describe('PkiNodeEnroller (v2, 9.4.3-D)', () => {
    let tree: PkiCaTreeResult;
    let tmpDir: string;

    beforeAll(async() => {
        tree = await PkiCaTree.create({organization: 'FlyingFishTest'});
    });

    beforeEach(async() => {
        tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ff-pki-'));
    });

    afterEach(async() => {
        await fs.promises.rm(tmpDir, {recursive: true, force: true});
    });

    test('first boot enrolls and persists the identity', async() => {
        const tokens = new PkiBootstrapTokenStore();
        const service = new PkiEnrollmentService(tree, tokens);
        const {token} = tokens.issue({purpose: PkiCaPurpose.service, autoApprove: true});

        const store = new PkiNodeFileStore(tmpDir);
        const client = new PkiNodeClient(makeTransport(service));
        const enroller = new PkiNodeEnroller(client, store, {
            bootstrapToken: token,
            purpose: PkiCaPurpose.service,
            commonName: 'dns@node-1'
        });

        const identity = await enroller.ensure();

        expect(identity.nodeUid).toBeTruthy();

        const loaded = await store.load();

        expect(loaded?.nodeUid).toBe(identity.nodeUid);
        expect(fs.existsSync(path.join(store.getDir(), 'node.crt'))).toBe(true);
        expect(fs.existsSync(path.join(store.getDir(), 'node.key'))).toBe(true);
    });

    test('a later boot before 2/3 reuses the stored identity', async() => {
        const tokens = new PkiBootstrapTokenStore();
        const service = new PkiEnrollmentService(tree, tokens);
        const {token} = tokens.issue({purpose: PkiCaPurpose.service, autoApprove: true});

        const store = new PkiNodeFileStore(tmpDir);
        const client = new PkiNodeClient(makeTransport(service));

        const first = await new PkiNodeEnroller(client, store, {
            bootstrapToken: token,
            purpose: PkiCaPurpose.service,
            commonName: 'dns@node-1'
        }).ensure();

        // second boot, clock at issuance time (not due) — reuses, no re-enroll
        const reused = await new PkiNodeEnroller(
            client,
            store,
            {bootstrapToken: 'unused', purpose: PkiCaPurpose.service, commonName: 'dns@node-1'},
            (): number => first.issuedAt
        ).ensure();

        expect(reused.nodeUid).toBe(first.nodeUid);
        expect(reused.certificate).toBe(first.certificate);
    });

    test('renews when due (~2/3), rotating the key but keeping the nodeUid', async() => {
        const tokens = new PkiBootstrapTokenStore();
        const service = new PkiEnrollmentService(tree, tokens);
        const {token} = tokens.issue({purpose: PkiCaPurpose.service, autoApprove: true});

        const store = new PkiNodeFileStore(tmpDir);
        const client = new PkiNodeClient(makeTransport(service));

        const first = await new PkiNodeEnroller(client, store, {
            bootstrapToken: token,
            purpose: PkiCaPurpose.service,
            commonName: 'dns@node-1'
        }).ensure();

        const due = first.issuedAt + Math.floor((first.expiresAt - first.issuedAt) * 2 / 3) + 1;

        const renewed = await new PkiNodeEnroller(
            client,
            store,
            {bootstrapToken: 'unused', purpose: PkiCaPurpose.service, commonName: 'dns@node-1'},
            (): number => due
        ).ensure();

        expect(renewed.nodeUid).toBe(first.nodeUid);
        expect(renewed.certificate).not.toBe(first.certificate);

        // the renewal was persisted
        const loaded = await store.load();

        expect(loaded?.certificate).toBe(renewed.certificate);
    });
});