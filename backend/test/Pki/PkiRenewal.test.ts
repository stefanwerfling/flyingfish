/**
 * Unit tests for PKI renewal (roadmap 9.4.3, slice A).
 *
 * Covers the ~2/3-lifetime renewal-due timing (PkiRenewal) and the enrollment
 * service's renew(): a renewed leaf keeps the stable nodeUid + SAN identity but
 * takes a fresh key from the new CSR (key rotation) and still chains to its
 * purpose intermediate. Network-free (Node WebCrypto).
 */
import * as x509 from '@peculiar/x509';
import {
    PkiBootstrapTokenStore,
    PkiCaPurpose,
    PkiCaTree,
    PkiCaTreeResult,
    PkiCertificateBuilder,
    PkiEnrollmentService,
    PkiEnrollmentStatus,
    PkiRenewal
} from 'flyingfish_core';

/**
 * Generate a node key pair and a CSR for it.
 * @param commonName - the requested common name
 */
const makeCsr = async(commonName: string): Promise<string> => {
    const keys = await PkiCertificateBuilder.generateKeyPair();

    return PkiCertificateBuilder.createCsr(`CN=${commonName}`, keys);
};

/**
 * The SAN URI values of a certificate PEM.
 * @param pem - the certificate PEM
 */
const sanValues = (pem: string): string[] => {
    const cert = new x509.X509Certificate(pem);
    const san = cert.getExtension(x509.SubjectAlternativeNameExtension);

    return (san?.names.toJSON() ?? []).map((name) => name.value);
};

/**
 * The base64 SubjectPublicKeyInfo of a certificate PEM (to compare keys).
 * @param pem - the certificate PEM
 */
const publicKeyOf = (pem: string): string => {
    const cert = new x509.X509Certificate(pem);

    return Buffer.from(cert.publicKey.rawData).toString('base64');
};

describe('PKI renewal (v2, 9.4.3)', () => {
    describe('renewal timing (~2/3 lifetime)', () => {
        test('renewAt is 2/3 into the lifetime', () => {
            expect(PkiRenewal.renewAt(0, 3000)).toBe(2000);
        });

        test('isDue flips at the 2/3 mark', () => {
            expect(PkiRenewal.isDue(0, 3000, 1999)).toBe(false);
            expect(PkiRenewal.isDue(0, 3000, 2000)).toBe(true);
            expect(PkiRenewal.isDue(0, 3000, 5000)).toBe(true);
        });

        test('an invalid or already-expired window is always due', () => {
            expect(PkiRenewal.isDue(1000, 1000, 1000)).toBe(true);
            expect(PkiRenewal.isDue(1000, 500, 1000)).toBe(true);
        });
    });

    describe('renew()', () => {
        let tree: PkiCaTreeResult;

        beforeAll(async() => {
            tree = await PkiCaTree.create({organization: 'FlyingFishTest'});
        });

        test('renew keeps the nodeUid + SAN identity but rotates the key', async() => {
            const store = new PkiBootstrapTokenStore();
            const service = new PkiEnrollmentService(tree, store);
            const {token} = store.issue({purpose: PkiCaPurpose.service, autoApprove: true});

            const first = await service.enroll({
                csr: await makeCsr('svc-a'),
                bootstrapToken: token,
                commonName: 'svc-a'
            });

            expect(first.status).toBe(PkiEnrollmentStatus.issued);

            const renewed = await service.renew({
                nodeUid: first.nodeUid,
                purpose: PkiCaPurpose.service,
                csr: await makeCsr('svc-a'),
                commonName: 'svc-a'
            });

            expect(renewed.status).toBe(PkiEnrollmentStatus.issued);

            // the identity is stable across the renewal
            expect(renewed.nodeUid).toBe(first.nodeUid);
            expect(sanValues(renewed.issued!.certificate)).toContain(`flyingfish://service/${first.nodeUid}`);

            // key rotation: the renewed leaf carries a different public key
            expect(publicKeyOf(renewed.issued!.certificate)).not.toBe(publicKeyOf(first.issued!.certificate));

            // and it still chains to the service intermediate
            expect(await PkiCertificateBuilder.verifyIssuedBy(
                renewed.issued!.certificate,
                tree.intermediates[PkiCaPurpose.service].certificate
            )).toBe(true);
        });

        test('renew rejects a CSR that fails proof of possession', async() => {
            const service = new PkiEnrollmentService(tree, new PkiBootstrapTokenStore());

            await expect(service.renew({
                nodeUid: 'uid-x',
                purpose: PkiCaPurpose.service,
                csr: 'not-a-valid-csr',
                commonName: 'svc-b'
            })).rejects.toThrow();
        });
    });
});