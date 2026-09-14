/* eslint-disable no-bitwise -- DER is a byte/bit encoding; bitwise ops are intrinsic. */

/**
 * A parsed DER value: the raw tag byte, whether it is constructed, its raw
 * content bytes, and (for constructed values) the parsed children.
 */
export type DerNode = {
    tag: number;
    constructed: boolean;
    content: Uint8Array;
    children: DerNode[];
};

/**
 * Minimal DER decoder for the FlyingFish own PKI library (own-pki-lib slice 2 —
 * the counterpart to {@link Der}). Walks the tag-length-value structure into a
 * DerNode tree and decodes the primitive types back to values. DER only:
 * definite lengths (indefinite length is rejected).
 */
export class DerReader {

    /**
     * Parse a single DER value that spans the whole buffer (throws on trailing
     * bytes). Constructed values are parsed recursively into `children`.
     * @param bytes - the DER bytes
     */
    public static parse(bytes: Uint8Array): DerNode {
        const {node, next} = DerReader._parseValue(bytes, 0);

        if (next !== bytes.length) {
            throw new Error(`DerReader.parse: ${bytes.length - next} trailing byte(s) after the value`);
        }

        return node;
    }

    /**
     * Decode an INTEGER node to a bigint (signed, two's complement).
     * @param node - the INTEGER node
     */
    public static toInteger(node: DerNode): bigint {
        const bytes = node.content;

        if (bytes.length === 0) {
            return 0n;
        }

        let result = 0n;

        for (const byte of bytes) {
            result = (result << 8n) | BigInt(byte);
        }

        if ((bytes[0] & 0x80) !== 0) {
            result -= 1n << BigInt(bytes.length * 8);
        }

        return result;
    }

    /**
     * Decode a BOOLEAN node.
     * @param node - the BOOLEAN node
     */
    public static toBoolean(node: DerNode): boolean {
        return node.content.length > 0 && node.content[0] !== 0x00;
    }

    /**
     * Decode an OBJECT IDENTIFIER node to its dotted string.
     * @param node - the OID node
     */
    public static toOidString(node: DerNode): string {
        const bytes = node.content;

        if (bytes.length === 0) {
            throw new Error('DerReader.toOidString: empty OID');
        }

        const first = bytes[0];
        const parts: number[] = first < 80 ? [Math.floor(first / 40), first % 40] : [2, first - 80];

        let value = 0;

        for (let index = 1; index < bytes.length; index += 1) {
            value = (value * 128) + (bytes[index] & 0x7f);

            if ((bytes[index] & 0x80) === 0) {
                parts.push(value);
                value = 0;
            }
        }

        return parts.join('.');
    }

    /**
     * Decode a BIT STRING node to its unused-bit count + content bytes.
     * @param node - the BIT STRING node
     */
    public static toBitString(node: DerNode): {unusedBits: number; bytes: Uint8Array;} {
        if (node.content.length === 0) {
            throw new Error('DerReader.toBitString: empty bit string');
        }

        return {
            unusedBits: node.content[0],
            bytes: node.content.subarray(1)
        };
    }

    /**
     * Decode a text string node (UTF8String / PrintableString / IA5String / ...)
     * to a JS string.
     * @param node - the string node
     */
    public static toText(node: DerNode): string {
        return new TextDecoder().decode(node.content);
    }

    /**
     * Decode a UTCTime (tag 0x17) or GeneralizedTime (tag 0x18) node to a Date.
     * @param node - the time node
     */
    public static toDate(node: DerNode): Date {
        const text = new TextDecoder().decode(node.content);

        if (node.tag === 0x17) {
            const year = Number(text.slice(0, 2));
            const fullYear = year < 50 ? 2000 + year : 1900 + year;

            return DerReader._buildDate(fullYear, text.slice(2));
        }

        return DerReader._buildDate(Number(text.slice(0, 4)), text.slice(4));
    }

    /**
     * Parse one TLV at `offset`, recursing into constructed values.
     * @param bytes - the DER bytes
     * @param offset - the start offset
     */
    private static _parseValue(bytes: Uint8Array, offset: number): {node: DerNode; next: number;} {
        if (offset >= bytes.length) {
            throw new Error('DerReader: unexpected end of input');
        }

        const tag = bytes[offset];
        let index = offset + 1;

        if (index > bytes.length) {
            throw new Error('DerReader: truncated length');
        }

        let length = bytes[index];
        index += 1;

        if ((length & 0x80) !== 0) {
            const numBytes = length & 0x7f;

            if (numBytes === 0) {
                throw new Error('DerReader: indefinite length is not valid DER');
            }

            length = 0;

            for (let counter = 0; counter < numBytes; counter += 1) {
                if (index >= bytes.length) {
                    throw new Error('DerReader: truncated long-form length');
                }

                length = (length * 256) + bytes[index];
                index += 1;
            }
        }

        const contentStart = index;
        const next = contentStart + length;

        if (next > bytes.length) {
            throw new Error('DerReader: content runs past the end of input');
        }

        const content = bytes.subarray(contentStart, next);
        const constructed = (tag & 0x20) !== 0;
        const children: DerNode[] = [];

        if (constructed) {
            let childOffset = contentStart;

            while (childOffset < next) {
                const parsed = DerReader._parseValue(bytes, childOffset);
                children.push(parsed.node);
                childOffset = parsed.next;
            }
        }

        return {
            node: {tag: tag, constructed: constructed, content: content, children: children},
            next: next
        };
    }

    /**
     * Build a UTC Date from the 'MMDDHHMMSSZ' body and a full year.
     * @param fullYear - the four-digit year
     * @param body - the 'MMDDHHMMSSZ' body
     */
    private static _buildDate(fullYear: number, body: string): Date {
        const month = Number(body.slice(0, 2));
        const day = Number(body.slice(2, 4));
        const hour = Number(body.slice(4, 6));
        const minute = Number(body.slice(6, 8));
        const second = Number(body.slice(8, 10));

        return new Date(Date.UTC(fullYear, month - 1, day, hour, minute, second));
    }

}