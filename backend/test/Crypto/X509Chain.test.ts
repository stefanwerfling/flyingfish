/**
 * Unit tests for the own-PKI chain builder (own-pki-lib slice 7b). A real
 * three-level tree (root -> intermediate -> leaf) is built with the own library,
 * then X509Chain.build assembles the ordered chain from an UNORDERED pool and
 * X509Chain.verify accepts a leaf that chains to a trusted root while rejecting a
 * missing root, a wrong root and a broken link. Network-free (Node WebCrypto).
 */
import {webcrypto} from 'crypto';
import {X509Chain, X509Der, X509Ext, X509Signer} from 'flyingfish_core';

type Ca = {name: Uint8Array; keys: webcrypto.CryptoKeyPair; certDer: Uint8Array;};

/**
 * Generate an Ed25519 key pair.
 */
const genKeys = async(): Promise<webcrypto.CryptoKeyPair> => {
    return webcrypto.subtle.generateKey({name: 'Ed25519'}, true, ['sign', 'verify']) as Promise<webcrypto.CryptoKeyPair>;
};

/**
 * Build a certificate DER with the own library.
 * @param serial - the serial byte
 * @param subjectName - the encoded subject Name
 * @param issuerName - the encoded issuer Name
 * @param subjectKeys - the subject's key pair (its public key goes in the cert)
 * @param signingKey - the issuer's private key
 * @param ca - whether this is a CA certificate
 */
const buildCert = async(
    serial: number,
    subjectName: Uint8Array,
    issuerName: Uint8Array,
    subjectKeys: webcrypto.CryptoKeyPair,
    signingKey: webcrypto.CryptoKey,
    ca: boolean
): Promise<Uint8Array> => {
    const spki = new Uint8Array(await webcrypto.subtle.exportKey('spki', subjectKeys.publicKey));

    const tbs = X509Der.tbsCertificate({
        serialNumber: Uint8Array.of(serial),
        signatureAlgorithm: X509Signer.signatureAlgorithm('ed25519'),
        issuer: issuerName,
        notBefore: new Date(Date.UTC(2024, 0, 1)),
        notAfter: new Date(Date.UTC(2039, 0, 1)),
        subject: subjectName,
        subjectPublicKeyInfo: spki,
        extensions: X509Der.extensions([X509Ext.basicConstraints(ca, undefined, true)])
    });

    return X509Signer.signCertificate(tbs, signingKey, 'ed25519');
};

/**
 * Build a self-signed root CA with the own library.
 * @param commonName - the CA common name
 */
const buildRoot = async(commonName: string): Promise<Ca> => {
    const name = X509Der.distinguishedName([{oid: '2.5.4.3', value: commonName}]);
    const keys = await genKeys();

    return {name: name, keys: keys, certDer: await buildCert(0x01, name, name, keys, keys.privateKey, true)};
};

describe('own PKI chain builder (own-pki-lib slice 7b)', () => {
    let root: Ca;
    let intermediate: Ca;
    let leafDer: Uint8Array;

    beforeAll(async() => {
        root = await buildRoot('FlyingFish Root CA');

        const interName = X509Der.distinguishedName([{oid: '2.5.4.3', value: 'FlyingFish Service Intermediate CA'}]);
        const interKeys = await genKeys();
        const interDer = await buildCert(0x02, interName, root.name, interKeys, root.keys.privateKey, true);
        intermediate = {name: interName, keys: interKeys, certDer: interDer};

        const leafName = X509Der.distinguishedName([{oid: '2.5.4.3', value: 'nginx-01'}]);
        const leafKeys = await genKeys();
        leafDer = await buildCert(0x03, leafName, interName, leafKeys, interKeys.privateKey, false);
    });

    test('build assembles the ordered chain from an unordered pool', async() => {
        // pool deliberately out of order (root before intermediate)
        const chain = await X509Chain.build(leafDer, [root.certDer, intermediate.certDer]);

        expect(chain).toHaveLength(3);
        expect(Buffer.from(chain[0]).equals(Buffer.from(leafDer))).toBe(true);
        expect(Buffer.from(chain[1]).equals(Buffer.from(intermediate.certDer))).toBe(true);
        expect(Buffer.from(chain[2]).equals(Buffer.from(root.certDer))).toBe(true);
    });

    test('verify accepts a leaf that chains to a trusted root', async() => {
        expect(await X509Chain.verify(leafDer, [intermediate.certDer, root.certDer])).toBe(true);
        // an intermediate also chains directly to the root
        expect(await X509Chain.verify(intermediate.certDer, [root.certDer])).toBe(true);
    });

    test('verify rejects a missing root, a wrong root and a broken link', async() => {
        // root not in the pool -> chain does not reach a self-signed anchor
        expect(await X509Chain.verify(leafDer, [intermediate.certDer])).toBe(false);

        // a different self-signed CA is not this chain's root
        const rogue = await buildRoot('Rogue Root CA');
        expect(await X509Chain.verify(leafDer, [intermediate.certDer, rogue.certDer])).toBe(false);

        // a leaf signed by a key other than the intermediate's does not link
        const forgedLeafName = X509Der.distinguishedName([{oid: '2.5.4.3', value: 'forged'}]);
        const forgedLeaf = await buildCert(0x04, forgedLeafName, intermediate.name, await genKeys(), rogue.keys.privateKey, false);
        expect(await X509Chain.verify(forgedLeaf, [intermediate.certDer, root.certDer])).toBe(false);
    });
});