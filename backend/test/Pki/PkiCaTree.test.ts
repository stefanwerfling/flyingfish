/**
 * Unit tests for the v2 PKI CA tree (PkiCaTree, roadmap 9.4.1).
 *
 * Builds the Root + purpose-Intermediate hierarchy and asserts the shape the
 * design requires: the Root is a CA with pathLength 1, every purpose
 * Intermediate is a CA (pathLength 0) signed by the Root and name-constrained
 * to its own flyingfish:// namespace, and a leaf issued under one intermediate
 * chains to the Root but does not verify under a sibling intermediate (purpose
 * isolation). Network-free (Node WebCrypto).
 */
import {Pem, PkiCaPurpose, PkiCaTree, PkiCaTreeResult, PkiCertificateBuilder, X509Name, X509Reader} from 'flyingfish_core';

describe('PkiCaTree (v2 PKI CA hierarchy)', () => {
    let tree: PkiCaTreeResult;

    beforeAll(async() => {
        tree = await PkiCaTree.create({organization: 'FlyingFishTest'});
    });

    test('the Root is a self-signed CA with pathLength 1', async() => {
        const rootDer = Pem.decode(tree.root.certificate);
        const bc = X509Reader.basicConstraints(rootDer);

        expect(bc?.ca).toBe(true);
        expect(bc?.pathLength).toBe(1);
        expect(X509Name.format(X509Reader.subjectAttributes(rootDer))).toContain('CN=FlyingFish Root CA');
        expect(await PkiCertificateBuilder.verifyIssuedBy(tree.root.certificate, tree.root.certificate)).toBe(true);
    });

    test('builds exactly one Intermediate per purpose', () => {
        const purposes = Object.keys(tree.intermediates).sort();

        expect(purposes).toEqual([PkiCaPurpose.cluster, PkiCaPurpose.device, PkiCaPurpose.service].sort());
    });

    test.each([
        [PkiCaPurpose.cluster, 'flyingfish://cluster/'],
        [PkiCaPurpose.service, 'flyingfish://service/'],
        [PkiCaPurpose.device, 'flyingfish://device/']
    ])('the %s Intermediate is a pathLen-0 CA, signed by the Root, constrained to %s', async(purpose, namespace) => {
        const node = tree.intermediates[purpose];
        const certDer = Pem.decode(node.certificate);

        // CA with no further CA below it.
        const bc = X509Reader.basicConstraints(certDer);
        expect(bc?.ca).toBe(true);
        expect(bc?.pathLength).toBe(0);

        // Signed by the Root.
        expect(await PkiCertificateBuilder.verifyIssuedBy(node.certificate, tree.root.certificate)).toBe(true);

        // Name-constrained to its own namespace.
        const nameConstraints = X509Reader.nameConstraints(certDer);
        expect(nameConstraints).not.toBeNull();
        expect(nameConstraints?.permittedUri).toContain(namespace);
    });

    test('a leaf issued under the service Intermediate chains to the Root', async() => {
        const leaf = await PkiCaTree.issueLeaf(tree.intermediates[PkiCaPurpose.service], {
            subject: 'CN=nginx@node-1, O=FlyingFishTest',
            validityDays: 7,
            san: [{type: 'url', value: 'flyingfish://service/nginx@node-1'}]
        });

        const chain = await PkiCertificateBuilder.buildChain(
            leaf.certificate,
            [tree.root.certificate, tree.intermediates[PkiCaPurpose.service].certificate]
        );

        expect(chain).toHaveLength(3);
        expect(leaf.keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    test('purpose isolation: a service leaf does not verify under the cluster Intermediate', async() => {
        const leaf = await PkiCaTree.issueLeaf(tree.intermediates[PkiCaPurpose.service], {
            subject: 'CN=svc, O=FlyingFishTest',
            validityDays: 7
        });

        expect(await PkiCertificateBuilder.verifyIssuedBy(
            leaf.certificate,
            tree.intermediates[PkiCaPurpose.service].certificate
        )).toBe(true);

        expect(await PkiCertificateBuilder.verifyIssuedBy(
            leaf.certificate,
            tree.intermediates[PkiCaPurpose.cluster].certificate
        )).toBe(false);
    });
});