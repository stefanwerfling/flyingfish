const PEM_LINE_LENGTH = 64;
const BLOCK_PATTERN = /-----BEGIN (?<label>[A-Z0-9 ]+)-----(?<body>[\s\S]*?)-----END \k<label>-----/gu;

/**
 * One decoded PEM block: its label (e.g. `CERTIFICATE`) and the DER it wrapped.
 */
export type PemBlock = {
    label: string;
    der: Uint8Array;
};

/**
 * PEM encode/decode for the FlyingFish own PKI library (own-pki-lib slice 6): the
 * textual wrapping (`-----BEGIN <label>-----`, base64 in 64-char lines) around the
 * DER the rest of the library produces/consumes. This is the on-disk / on-wire
 * form certificates, CSRs and CRLs travel in.
 */
export class Pem {

    /**
     * The label of a certificate PEM block.
     */
    public static readonly CERTIFICATE = 'CERTIFICATE';

    /**
     * The label of a PKCS#10 certificate-request PEM block.
     */
    public static readonly CERTIFICATE_REQUEST = 'CERTIFICATE REQUEST';

    /**
     * The label of a CRL PEM block (matches openssl's `X509 CRL`).
     */
    public static readonly CRL = 'X509 CRL';

    /**
     * Wrap DER in a PEM block: `-----BEGIN <label>-----`, base64 split into
     * 64-character lines, `-----END <label>-----`, with a trailing newline.
     * @param label - the PEM label (e.g. {@link Pem.CERTIFICATE})
     * @param der - the DER bytes to wrap
     */
    public static encode(label: string, der: Uint8Array): string {
        const base64 = Buffer.from(der).toString('base64');
        const lines = base64.match(new RegExp(`.{1,${PEM_LINE_LENGTH}}`, 'gu')) ?? [];

        return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
    }

    /**
     * Decode the first PEM block (optionally restricted to a label) to its DER.
     * Throws if no matching block is found.
     * @param pem - the PEM text
     * @param label - the label to require, if any
     */
    public static decode(pem: string, label?: string): Uint8Array {
        const block = Pem.decodeAll(pem, label)[0];

        if (block === undefined) {
            throw new Error(`no PEM block${label === undefined ? '' : ` with label ${label}`} found`);
        }

        return block.der;
    }

    /**
     * Decode every PEM block (optionally restricted to a label), in order. Useful
     * for a certificate bundle / chain file.
     * @param pem - the PEM text
     * @param label - the label to require, if any
     */
    public static decodeAll(pem: string, label?: string): PemBlock[] {
        const blocks: PemBlock[] = [];

        for (const match of pem.matchAll(BLOCK_PATTERN)) {
            const found = match.groups?.label ?? '';

            if (label !== undefined && found !== label) {
                continue;
            }

            const body = (match.groups?.body ?? '').replace(/\s+/gu, '');

            blocks.push({label: found, der: new Uint8Array(Buffer.from(body, 'base64'))});
        }

        return blocks;
    }

}