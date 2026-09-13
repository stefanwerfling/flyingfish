/**
 * Unit tests for intermediate CA rollover (roadmap 9.4.3-E1). Rolling a purpose
 * intermediate mints a NEW key under the SAME root and subject, so both the old
 * and the rolled intermediate chain to the root (overlap), and leaves issued from
 * the rolled one still build a full chain. Network-free (Node WebCrypto).
 */
import * as x509 from '@peculiar/x509';
import {
    PkiCaPurpose,
    PkiCaTree,
    PkiCaTreeResult,
    PkiCertificateBuilder
} from 'flyingfish_core';

/**
 * The base64 SubjectPublicKeyInfo of a certificate PEM (to compare keys).
 * @param pem - the certificate PEM
 */
const publicKeyOf = (pem: string): string => {
    return Buffer.from(new x509.X509Certificate(pem).publicKey.rawData).toString('base64');
};

/**
 * The subject DN of a certificate PEM.
 * @param pem - the certificate PEM
 */
const subjectOf = (pem: string): string => {
    return new x509.X509Certificate(pem).subject;
};

describe('PKI intermediate rollover (v2, 9.4.3-E1)', () => {
    let tree: PkiCaTreeResult;

    beforeAll(async() => {
        tree = await PkiCaTree.create({organization: 'FlyingFishTest'});
    });

    test('rollIntermediate mints a new key under the same root and subject', async() => {
        const old = tree.intermediates[PkiCaPurpose.service];
        const rolled = await PkiCaTree.rollIntermediate(tree.root, PkiCaPurpose.service);

        // signed by the same root
        expect(await PkiCertificateBuilder.verifyIssuedBy(rolled.certificate, tree.root.certificate)).toBe(true);

        // same purpose identity (subject), rotated key
        expect(subjectOf(rolled.certificate)).toBe(subjectOf(old.certificate));
        expect(publicKeyOf(rolled.certificate)).not.toBe(publicKeyOf(old.certificate));
        expect(rolled.privateKey).not.toBe(old.privateKey);
    });

    test('leaves issued from the rolled intermediate chain to the root', async() => {
        const rolled = await PkiCaTree.rollIntermediate(tree.root, PkiCaPurpose.service);

        const leaf = await PkiCaTree.issueLeaf(rolled, {
            subject: 'CN=svc-after-roll',
            validityDays: 7,
            san: [{type: 'url', value: `flyingfish://${PkiCaPurpose.service}/node-1`}]
        });

        expect(await PkiCertificateBuilder.verifyIssuedBy(leaf.certificate, rolled.certificate)).toBe(true);

        const chain = await PkiCertificateBuilder.buildChain(leaf.certificate, [
            rolled.certificate,
            tree.root.certificate
        ]);

        expect(chain).toHaveLength(3);
    });

    test('the old intermediate still verifies against the root (overlap)', async() => {
        const old = tree.intermediates[PkiCaPurpose.service];

        // rolling does not invalidate the old intermediate — both chain to the root
        expect(await PkiCertificateBuilder.verifyIssuedBy(old.certificate, tree.root.certificate)).toBe(true);
    });
});