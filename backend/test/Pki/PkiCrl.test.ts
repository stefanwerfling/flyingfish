/**
 * Unit tests for the PKI CRL backup (roadmap 9.4.4-E), now built on the own PKI
 * library (this was blocked by @peculiar/x509's broken CRL round-trip and is the
 * reason the own lib exists). A CRL our CA signs lists the revoked serials,
 * verifies under the issuing CA, matches revoked certificates and rejects a wrong
 * issuer; PkiEnrollmentService.signCrl wires a purpose intermediate into it.
 * Network-free (Node WebCrypto).
 */
import {
    PkiBootstrapTokenStore,
    PkiCaPurpose,
    PkiCaTree,
    PkiCertificateBuilder,
    PkiEnrollmentService,
    PkiIssuer,
    PkiKeyAlgorithm
} from 'flyingfish_core';

const REVOKED_AT = new Date(Date.UTC(2026, 0, 2));
const NEXT_UPDATE = new Date(Date.UTC(2026, 0, 9));

/**
 * Build a root CA + one intermediate signed by it (Ed25519), returning both PEMs
 * plus the intermediate's private key for signing leaves / CRLs.
 */
const buildCa = async(): Promise<{intermediate: string; intermediateKey: CryptoKey; root: string;}> => {
    const rootKeys = await PkiCertificateBuilder.generateKeyPair();
    const root = await PkiCertificateBuilder.createRootCa({subject: 'CN=Root, O=FF', validityDays: 3650, pathLength: 1}, rootKeys);

    const interKeys = await PkiCertificateBuilder.generateKeyPair();
    const rootIssuer: PkiIssuer = {certificate: root, privateKey: rootKeys.privateKey};
    const intermediate = await PkiCertificateBuilder.createIntermediateCa(
        {subject: 'CN=Service Intermediate, O=FF', validityDays: 730}, interKeys.publicKey, rootIssuer
    );

    return {intermediate: intermediate, intermediateKey: interKeys.privateKey, root: root};
};

/**
 * Issue a leaf certificate from an intermediate. A fixed serial can be pinned to
 * make the test deterministic; 'e1..' has its high bit set, exercising the
 * positive-padding path in the serial encoding.
 * @param intermediate - the intermediate certificate PEM
 * @param intermediateKey - the intermediate private key
 * @param cn - the leaf common name
 * @param serialNumber - an optional fixed serial (hex)
 */
const issueLeaf = async(
    intermediate: string,
    intermediateKey: CryptoKey,
    cn: string,
    serialNumber?: string
): Promise<string> => {
    const leafKeys = await PkiCertificateBuilder.generateKeyPair();

    return PkiCertificateBuilder.createLeafCertificate(
        {subject: `CN=${cn}, O=FF`, validityDays: 7, serialNumber: serialNumber},
        leafKeys.publicKey,
        {certificate: intermediate, privateKey: intermediateKey}
    );
};

describe('PKI CRL backup (roadmap 9.4.4-E, own PKI lib)', () => {
    test('a signed CRL lists + matches the revoked certificates and verifies', async() => {
        const ca = await buildCa();
        // pinned high-bit serial: exercises the positive-padding path deterministically
        const revoked = await issueLeaf(ca.intermediate, ca.intermediateKey, 'node-1', 'e1a2b3c4d5e6f70011223344556677');
        const other = await issueLeaf(ca.intermediate, ca.intermediateKey, 'node-2', '2b');

        const crl = await PkiCertificateBuilder.createCrl(
            ca.intermediate,
            ca.intermediateKey,
            [{certificate: revoked, revocationDate: REVOKED_AT}],
            PkiKeyAlgorithm.ed25519,
            {nextUpdate: NEXT_UPDATE}
        );

        // verifies under the issuing CA, not under a different one (the root)
        expect(await PkiCertificateBuilder.verifyCrl(crl, ca.intermediate)).toBe(true);
        expect(await PkiCertificateBuilder.verifyCrl(crl, ca.root)).toBe(false);

        // the revoked cert is listed; an un-revoked one is not
        expect(PkiCertificateBuilder.listRevokedSerials(crl)).toContain(PkiCertificateBuilder.getCertSerialHex(revoked));
        expect(PkiCertificateBuilder.isCertificateRevoked(crl, revoked)).toBe(true);
        expect(PkiCertificateBuilder.isCertificateRevoked(crl, other)).toBe(false);
    });

    test('an empty CRL is still a valid signed list', async() => {
        const ca = await buildCa();
        const crl = await PkiCertificateBuilder.createCrl(ca.intermediate, ca.intermediateKey, []);

        expect(await PkiCertificateBuilder.verifyCrl(crl, ca.intermediate)).toBe(true);
        expect(PkiCertificateBuilder.listRevokedSerials(crl)).toEqual([]);
    });

    test('PkiEnrollmentService.signCrl signs from the purpose intermediate', async() => {
        const tree = await PkiCaTree.create({organization: 'FlyingFishTest'});
        const service = new PkiEnrollmentService(tree, new PkiBootstrapTokenStore());

        const intermediate = tree.intermediates[PkiCaPurpose.service];
        const intermediateKey = await PkiCertificateBuilder.importPrivateKey(intermediate.privateKey, tree.algorithm);
        const leaf = await issueLeaf(intermediate.certificate, intermediateKey, 'svc-node');

        const crl = await service.signCrl(PkiCaPurpose.service, [{certificate: leaf, revocationDate: REVOKED_AT}]);

        expect(await PkiCertificateBuilder.verifyCrl(crl, intermediate.certificate)).toBe(true);
        expect(PkiCertificateBuilder.isCertificateRevoked(crl, leaf)).toBe(true);
    });
});