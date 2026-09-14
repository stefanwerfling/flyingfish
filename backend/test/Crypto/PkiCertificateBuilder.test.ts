/**
 * Unit tests for the v2 PKI crypto primitive (PkiCertificateBuilder).
 *
 * Builds a real Root -> Service-Intermediate -> Leaf chain with Ed25519 (and a
 * P-256 fallback smoke), and asserts the signature links, the CA/leaf X.509
 * extensions (basicConstraints, keyUsage, EKU, SAN incl. dual-stack IPs and the
 * flyingfish://node/<uuid> identity URI) and the chain assembly. Network-free:
 * everything runs against Node's built-in WebCrypto.
 */
import {Pem, PkiCertificateBuilder, PkiKeyAlgorithm, X509Name, X509Reader} from 'flyingfish_core';

const EKU_SERVER_AUTH = '1.3.6.1.5.5.7.3.1';
const EKU_CLIENT_AUTH = '1.3.6.1.5.5.7.3.2';

describe('PkiCertificateBuilder (v2 PKI crypto primitive)', () => {
    test('generates an Ed25519 key pair and exports it to PEM', async() => {
        const keyPair = await PkiCertificateBuilder.generateKeyPair(PkiKeyAlgorithm.ed25519);

        expect(keyPair.privateKey.algorithm.name).toBe('Ed25519');

        const pem = await PkiCertificateBuilder.exportKeyPair(keyPair);

        expect(pem.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
        expect(pem.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
    });

    test('builds and verifies a Root -> Intermediate -> Leaf Ed25519 chain', async() => {
        // Root CA (self-signed).
        const rootKeys = await PkiCertificateBuilder.generateKeyPair();
        const rootPem = await PkiCertificateBuilder.createRootCa({
            subject: 'CN=FlyingFish Root CA, O=FlyingFish',
            validityDays: 365 * 15,
            pathLength: 2
        }, rootKeys);

        // Service Intermediate CA (signed by root).
        const interKeys = await PkiCertificateBuilder.generateKeyPair();
        const interPem = await PkiCertificateBuilder.createIntermediateCa({
            subject: 'CN=FlyingFish Service Intermediate CA, O=FlyingFish',
            validityDays: 365 * 2,
            pathLength: 0
        }, interKeys.publicKey, {
            certificate: rootPem,
            privateKey: rootKeys.privateKey
        });

        // Leaf (service cert, signed by the intermediate).
        const leafKeys = await PkiCertificateBuilder.generateKeyPair();
        const leafPem = await PkiCertificateBuilder.createLeafCertificate({
            subject: 'CN=nginx@node-abc, O=FlyingFish',
            validityDays: 7,
            san: [
                {type: 'url', value: 'flyingfish://node/1f0c8e2a-0000-4000-8000-000000000001'},
                {type: 'dns', value: 'nginx'},
                {type: 'ip', value: '10.103.0.9'},
                {type: 'ip', value: 'fd00::9'}
            ]
        }, leafKeys.publicKey, {
            certificate: interPem,
            privateKey: interKeys.privateKey
        });

        // Signature links hold in both directions of the chain.
        expect(await PkiCertificateBuilder.verifyIssuedBy(leafPem, interPem)).toBe(true);
        expect(await PkiCertificateBuilder.verifyIssuedBy(interPem, rootPem)).toBe(true);
        expect(await PkiCertificateBuilder.verifyIssuedBy(rootPem, rootPem)).toBe(true);

        // A wrong issuer must not verify.
        expect(await PkiCertificateBuilder.verifyIssuedBy(leafPem, rootPem)).toBe(false);
    });

    test('assembles the chain leaf -> intermediate -> root', async() => {
        const rootKeys = await PkiCertificateBuilder.generateKeyPair();
        const rootPem = await PkiCertificateBuilder.createRootCa({
            subject: 'CN=Root, O=FF',
            validityDays: 3650,
            pathLength: 1
        }, rootKeys);

        const interKeys = await PkiCertificateBuilder.generateKeyPair();
        const interPem = await PkiCertificateBuilder.createIntermediateCa({
            subject: 'CN=Inter, O=FF',
            validityDays: 730
        }, interKeys.publicKey, {certificate: rootPem, privateKey: rootKeys.privateKey});

        const leafKeys = await PkiCertificateBuilder.generateKeyPair();
        const leafPem = await PkiCertificateBuilder.createLeafCertificate({
            subject: 'CN=leaf, O=FF',
            validityDays: 7
        }, leafKeys.publicKey, {certificate: interPem, privateKey: interKeys.privateKey});

        const chain = await PkiCertificateBuilder.buildChain(leafPem, [rootPem, interPem]);

        expect(chain).toHaveLength(3);

        // Chain is ordered leaf-first.
        const subjects = chain.map((pem) => X509Name.format(X509Reader.subjectAttributes(Pem.decode(pem))));

        expect(subjects[0]).toContain('CN=leaf');
        expect(subjects[2]).toContain('CN=Root');
    });

    test('the Root CA carries CA:true basicConstraints with the given pathLength', async() => {
        const rootKeys = await PkiCertificateBuilder.generateKeyPair();
        const rootPem = await PkiCertificateBuilder.createRootCa({
            subject: 'CN=Root, O=FF',
            validityDays: 3650,
            pathLength: 2
        }, rootKeys);

        const bc = X509Reader.basicConstraints(Pem.decode(rootPem));

        expect(bc?.ca).toBe(true);
        expect(bc?.pathLength).toBe(2);
    });

    test('the leaf carries the mTLS EKUs and dual-stack SAN incl. the identity URI', async() => {
        const rootKeys = await PkiCertificateBuilder.generateKeyPair();
        const rootPem = await PkiCertificateBuilder.createRootCa({
            subject: 'CN=Root, O=FF',
            validityDays: 3650
        }, rootKeys);

        const leafKeys = await PkiCertificateBuilder.generateKeyPair();
        const leafPem = await PkiCertificateBuilder.createLeafCertificate({
            subject: 'CN=svc, O=FF',
            validityDays: 7,
            san: [
                {type: 'url', value: 'flyingfish://node/uuid-1'},
                {type: 'ip', value: '192.0.2.10'},
                {type: 'ip', value: '2001:db8::10'}
            ]
        }, leafKeys.publicKey, {certificate: rootPem, privateKey: rootKeys.privateKey});

        const leafDer = Pem.decode(leafPem);

        const eku = X509Reader.extendedKeyUsage(leafDer);
        expect(eku).toContain(EKU_CLIENT_AUTH);
        expect(eku).toContain(EKU_SERVER_AUTH);

        const sanValues = X509Reader.subjectAltNames(leafDer).map((entry) => entry.value);

        expect(sanValues).toContain('flyingfish://node/uuid-1');
        expect(sanValues).toContain('192.0.2.10');
        expect(sanValues).toContain('2001:db8::10');

        // basicConstraints must mark the leaf as a non-CA.
        expect(X509Reader.basicConstraints(leafDer)?.ca).toBe(false);
    });

    test('supports the ECDSA P-256 fallback end to end', async() => {
        const rootKeys = await PkiCertificateBuilder.generateKeyPair(PkiKeyAlgorithm.p256);

        expect(rootKeys.privateKey.algorithm.name).toBe('ECDSA');

        const rootPem = await PkiCertificateBuilder.createRootCa({
            subject: 'CN=P256 Root, O=FF',
            validityDays: 3650
        }, rootKeys, PkiKeyAlgorithm.p256);

        const leafKeys = await PkiCertificateBuilder.generateKeyPair(PkiKeyAlgorithm.p256);
        const leafPem = await PkiCertificateBuilder.createLeafCertificate({
            subject: 'CN=p256 leaf, O=FF',
            validityDays: 7
        }, leafKeys.publicKey, {certificate: rootPem, privateKey: rootKeys.privateKey}, PkiKeyAlgorithm.p256);

        expect(await PkiCertificateBuilder.verifyIssuedBy(leafPem, rootPem)).toBe(true);
    });
});