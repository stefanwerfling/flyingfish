/**
 * Unit tests for the own-PKI X.509 extension encoders (own-pki-lib slice 7). Each
 * extension our library encodes is compared BYTE-FOR-BYTE against the DER the
 * reference we are dropping (@peculiar/x509) produces for the same inputs —
 * BasicConstraints, KeyUsage, ExtendedKeyUsage, Subject/Authority Key Identifier
 * (incl. the RFC 5280 method-1 SHA-1 key id), SubjectAltName (dns/ip4/ip6/url) and
 * NameConstraints. Equal bytes prove the encoders can replace @peculiar in the
 * certificate builder. Network-free (Node WebCrypto).
 */
import 'reflect-metadata';
import {AsnConvert} from '@peculiar/asn1-schema';
import {GeneralName, GeneralSubtree, GeneralSubtrees, NameConstraints, id_ce_nameConstraints} from '@peculiar/asn1-x509';
import * as x509 from '@peculiar/x509';
import {webcrypto} from 'crypto';
import {X509Ext} from 'flyingfish_core';

x509.cryptoProvider.set(webcrypto as unknown as Crypto);

/**
 * The full Extension DER of a @peculiar extension.
 * @param extension - the reference extension
 */
const ref = (extension: x509.Extension): Uint8Array => new Uint8Array(extension.rawData);

/**
 * Whether our encoded extension matches the reference bytes exactly.
 * @param ours - our encoded Extension DER
 * @param reference - the reference Extension DER
 */
const same = (ours: Uint8Array, reference: Uint8Array): boolean => Buffer.from(ours).equals(Buffer.from(reference));

describe('own PKI extension encoders (own-pki-lib slice 7)', () => {
    test('BasicConstraints matches @peculiar (CA with pathLen, and a leaf)', () => {
        expect(same(
            X509Ext.basicConstraints(true, 1, true),
            ref(new x509.BasicConstraintsExtension(true, 1, true))
        )).toBe(true);

        expect(same(
            X509Ext.basicConstraints(false, undefined, true),
            ref(new x509.BasicConstraintsExtension(false, undefined, true))
        )).toBe(true);
    });

    test('KeyUsage matches @peculiar (keyCertSign+cRLSign, and digitalSignature)', () => {
        expect(same(
            X509Ext.keyUsage([X509Ext.KU_KEY_CERT_SIGN, X509Ext.KU_CRL_SIGN], true),
            ref(new x509.KeyUsagesExtension(x509.KeyUsageFlags.keyCertSign + x509.KeyUsageFlags.cRLSign, true))
        )).toBe(true);

        expect(same(
            X509Ext.keyUsage([X509Ext.KU_DIGITAL_SIGNATURE], true),
            ref(new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature, true))
        )).toBe(true);
    });

    test('ExtendedKeyUsage (clientAuth + serverAuth) matches @peculiar', () => {
        expect(same(
            X509Ext.extendedKeyUsage([X509Ext.EKU_CLIENT_AUTH, X509Ext.EKU_SERVER_AUTH], false),
            ref(new x509.ExtendedKeyUsageExtension([x509.ExtendedKeyUsage.clientAuth, x509.ExtendedKeyUsage.serverAuth], false))
        )).toBe(true);
    });

    test('Subject/Authority Key Identifier match @peculiar (RFC 5280 method-1 SHA-1)', async() => {
        const keys = await webcrypto.subtle.generateKey({name: 'Ed25519'}, true, ['sign', 'verify']) as webcrypto.CryptoKeyPair;
        const keyId = await X509Ext.keyIdentifier(keys.publicKey);

        expect(same(
            X509Ext.subjectKeyIdentifier(keyId),
            ref(await x509.SubjectKeyIdentifierExtension.create(keys.publicKey))
        )).toBe(true);

        expect(same(
            X509Ext.authorityKeyIdentifier(keyId),
            ref(await x509.AuthorityKeyIdentifierExtension.create(keys.publicKey))
        )).toBe(true);
    });

    test('SubjectAltName (dns, ip4, ip6, url) matches @peculiar', () => {
        const entries = [
            {type: 'dns' as const, value: 'nginx-01.service.flyingfish.internal'},
            {type: 'ip' as const, value: '10.20.30.40'},
            {type: 'ip' as const, value: '2001:db8::1'},
            {type: 'url' as const, value: 'flyingfish://node/2f1c'}
        ];

        expect(same(
            X509Ext.subjectAltName(entries),
            ref(new x509.SubjectAlternativeNameExtension(entries.map((e) => ({type: e.type, value: e.value}))))
        )).toBe(true);
    });

    test('NameConstraints (permitted dns + uri subtrees) matches @peculiar', () => {
        const nameConstraints = new NameConstraints({
            permittedSubtrees: new GeneralSubtrees([
                new GeneralSubtree({base: new GeneralName({dNSName: '.service.flyingfish.internal'})}),
                new GeneralSubtree({base: new GeneralName({uniformResourceIdentifier: 'flyingfish://service/'})})
            ])
        });

        const reference = new x509.Extension(id_ce_nameConstraints, true, AsnConvert.serialize(nameConstraints));

        expect(same(
            X509Ext.nameConstraints(['.service.flyingfish.internal'], ['flyingfish://service/'], true),
            ref(reference)
        )).toBe(true);
    });
});