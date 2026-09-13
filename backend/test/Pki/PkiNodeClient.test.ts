/**
 * Unit tests for the node-side PKI client (roadmap 9.4.3-D core / mTLS goal).
 *
 * Drives the client against a transport backed by an in-process
 * PkiEnrollmentService + CA tree — no network — so it exercises the real
 * enroll/renew round-trip: the node generates its key locally, enrolls, and the
 * issued leaf chains to the CA; renewal rotates the key while keeping the stable
 * nodeUid; needsRenew flips at ~2/3 of the lifetime.
 */
import * as x509 from '@peculiar/x509';
import {
    PkiBootstrapTokenStore,
    PkiCaPurpose,
    PkiCaTree,
    PkiCaTreeResult,
    PkiCertificateBuilder,
    PkiEnrollmentService,
    PkiNodeClient,
    PkiNodeEnrollResult,
    PkiNodeTransport
} from 'flyingfish_core';

/**
 * The base64 SubjectPublicKeyInfo of a certificate PEM (to compare keys).
 * @param pem - the certificate PEM
 */
const publicKeyOf = (pem: string): string => {
    const cert = new x509.X509Certificate(pem);

    return Buffer.from(cert.publicKey.rawData).toString('base64');
};

describe('PkiNodeClient (v2, 9.4.3-D core)', () => {
    let tree: PkiCaTreeResult;
    let tokens: PkiBootstrapTokenStore;
    let service: PkiEnrollmentService;
    let transport: PkiNodeTransport;

    beforeAll(async() => {
        tree = await PkiCaTree.create({organization: 'FlyingFishTest'});
    });

    beforeEach(() => {
        tokens = new PkiBootstrapTokenStore();
        service = new PkiEnrollmentService(tree, tokens);

        // a transport backed by the in-process enrollment service (no network)
        transport = {
            enroll: async(request): Promise<PkiNodeEnrollResult> => {
                const issued = await service.enroll({
                    csr: request.csr,
                    bootstrapToken: request.bootstrapToken,
                    commonName: request.commonName,
                    sans: request.sans,
                    validityDays: request.validityDays
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
    });

    test('enroll returns a usable identity backed by a locally-generated key', async() => {
        const {token} = tokens.issue({purpose: PkiCaPurpose.service, autoApprove: true});
        const client = new PkiNodeClient(transport);

        const identity = await client.enroll({
            bootstrapToken: token,
            purpose: PkiCaPurpose.service,
            commonName: 'nginx@node-1'
        });

        expect(identity.nodeUid).toBeTruthy();
        expect(identity.purpose).toBe(PkiCaPurpose.service);
        expect(identity.chain).toHaveLength(3);
        expect(identity.privateKey).toContain('PRIVATE KEY');
        expect(identity.expiresAt).toBeGreaterThan(identity.issuedAt);

        // the issued leaf chains to the service intermediate
        expect(await PkiCertificateBuilder.verifyIssuedBy(
            identity.certificate,
            tree.intermediates[PkiCaPurpose.service].certificate
        )).toBe(true);
    });

    test('needsRenew flips at ~2/3 of the certificate lifetime', async() => {
        const {token} = tokens.issue({purpose: PkiCaPurpose.service, autoApprove: true});

        const identity = await new PkiNodeClient(transport).enroll({
            bootstrapToken: token,
            purpose: PkiCaPurpose.service,
            commonName: 'svc-a'
        });

        const twoThirds = identity.issuedAt + Math.floor((identity.expiresAt - identity.issuedAt) * 2 / 3);

        expect(PkiNodeClient.needsRenew(identity, identity.issuedAt)).toBe(false);
        expect(PkiNodeClient.needsRenew(identity, twoThirds)).toBe(true);
    });

    test('renew rotates the key but keeps the stable nodeUid', async() => {
        const {token} = tokens.issue({purpose: PkiCaPurpose.service, autoApprove: true});
        const client = new PkiNodeClient(transport);

        const first = await client.enroll({
            bootstrapToken: token,
            purpose: PkiCaPurpose.service,
            commonName: 'svc-a'
        });

        const renewed = await client.renew(first);

        expect(renewed.nodeUid).toBe(first.nodeUid);
        expect(renewed.privateKey).not.toBe(first.privateKey);
        expect(publicKeyOf(renewed.certificate)).not.toBe(publicKeyOf(first.certificate));
    });
});