import {DerNode, DerReader} from './DerReader.js';

/**
 * Reads a CRL (CertificateList) for the FlyingFish own PKI library (own-pki-lib
 * slice 5) — the consumer side of the CRL the {@link X509Signer} produces. This
 * is what replaces @peculiar's broken CRL parsing: it extracts the revoked
 * serial numbers so the Hub allowlist / a verifier can check them.
 */
export class X509Crl {

    /**
     * The revoked serial numbers in a CRL, as normalized lower-case hex (leading
     * zeros stripped so a positive-padding byte does not cause a mismatch).
     * @param crlDer - the CertificateList DER
     */
    public static listRevokedSerials(crlDer: Uint8Array): string[] {
        const revoked = X509Crl._revokedCertificates(DerReader.parse(crlDer));

        if (revoked === null) {
            return [];
        }

        return revoked.children.map((entry) => X509Crl._serialHex(entry.children[0]));
    }

    /**
     * Whether a serial number (hex) is listed as revoked in a CRL. Serials are
     * compared normalized (lower-case, leading zeros stripped).
     * @param crlDer - the CertificateList DER
     * @param serialNumberHex - the serial number (hex) to look for
     */
    public static isSerialRevoked(crlDer: Uint8Array, serialNumberHex: string): boolean {
        return X509Crl.listRevokedSerials(crlDer).includes(X509Crl._normalizeHex(serialNumberHex));
    }

    /**
     * Find the revokedCertificates SEQUENCE in a parsed CertificateList: the
     * first constructed SEQUENCE after the thisUpdate/nextUpdate Time fields.
     * @param crl - the parsed CertificateList
     */
    private static _revokedCertificates(crl: DerNode): DerNode | null {
        const tbs = crl.children[0];
        let seenTime = false;

        for (const child of tbs.children) {
            if (child.tag === 0x17 || child.tag === 0x18) {
                seenTime = true;
            } else if (seenTime && child.tag === 0x30) {
                return child;
            }
        }

        return null;
    }

    /**
     * The normalized hex serial of a revokedCertificate entry's INTEGER node.
     * @param serialNode - the userCertificate INTEGER node
     */
    private static _serialHex(serialNode: DerNode): string {
        const hex = Array.from(serialNode.content).map((byte) => byte.toString(16).padStart(2, '0')).join('');

        return X509Crl._normalizeHex(hex);
    }

    /**
     * Lower-case a hex string and strip leading zeros (never to empty).
     * @param hex - the hex string
     */
    private static _normalizeHex(hex: string): string {
        return hex.toLowerCase().replace(/^0+/u, '') || '0';
    }

}