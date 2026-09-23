import {ClusterByteDuplex} from './ClusterByteDuplex.js';

/**
 * 4-byte big-endian length prefix, matching {@link ClusterPeerChannel} framing so
 * the bootstrap exchange rides the same byte duplex the mesh channel later uses.
 */
const LENGTH_PREFIX_BYTES = 4;

/**
 * How long a side waits for the peer's HELLO before giving up (the connection is
 * then torn down by the caller).
 */
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * The single message each side sends in the pre-trust bootstrap exchange (Cluster/
 * Mesh epic 9.5.12.2, model (b), "one-port" in-band join): its own CA chain and,
 * from the DIALER (the joining node), the single-use join token authorising it.
 */
export type ClusterBootstrapHello = {
    caChain: string[];
    token?: string;
};

/**
 * The pre-trust bootstrap handshake for the "one-port" cross-Hub join (model (b)).
 * When a seed dial reaches a peer neither side trusts yet, this runs FIRST over the
 * raw peer duplex — the very connection the mesh will use — so no second port is
 * needed: each side sends its CA chain (the dialer also its join token), then reads
 * the peer's. It is pure transport: it moves the two HELLO messages and nothing
 * more. The CALLER decides trust — validate the token, pin the CA fingerprint, add
 * the peer CA to the bootstrap trust set — and then re-runs the normal peer
 * authentication against the now-updated trust set to promote the raw connection to
 * a full authenticated {@link ClusterPeerChannel}.
 */
export class ClusterBootstrapHandshake {

    /**
     * Send our HELLO and read the peer's, over the given duplex. Both sides write
     * immediately and then read, so the exchange is deadlock-free regardless of who
     * dialed. Returns the peer's HELLO, or null on a malformed message, a closed/
     * errored connection, or a timeout.
     * @param duplex - the raw (not-yet-authenticated) peer byte duplex
     * @param ownHello - this side's HELLO (own CA chain, + token when dialing)
     * @param timeoutMs - how long to wait for the peer's HELLO
     */
    public static async exchange(
        duplex: ClusterByteDuplex,
        ownHello: ClusterBootstrapHello,
        timeoutMs: number = DEFAULT_TIMEOUT_MS
    ): Promise<ClusterBootstrapHello | null> {
        return new Promise<ClusterBootstrapHello | null>((resolve): void => {
            let buffer = Buffer.alloc(0);
            let settled = false;

            const finish = (result: ClusterBootstrapHello | null): void => {
                if (settled) {
                    return;
                }

                settled = true;
                clearTimeout(timer);
                resolve(result);
            };

            const timer = setTimeout((): void => finish(null), timeoutMs);

            duplex.onData((chunk: Buffer): void => {
                buffer = Buffer.concat([buffer, chunk]);

                if (buffer.length < LENGTH_PREFIX_BYTES) {
                    return;
                }

                const length = buffer.readUInt32BE(0);

                if (buffer.length < LENGTH_PREFIX_BYTES + length) {
                    return;
                }

                finish(ClusterBootstrapHandshake._parse(buffer.subarray(LENGTH_PREFIX_BYTES, LENGTH_PREFIX_BYTES + length)));
            });

            duplex.onClose((): void => finish(null));
            duplex.onError((): void => finish(null));

            duplex.write(ClusterBootstrapHandshake._frame(ownHello));
        });
    }

    /**
     * Length-frame a HELLO for the wire.
     * @param hello - the HELLO to encode
     * @protected
     */
    protected static _frame(hello: ClusterBootstrapHello): Buffer {
        const payload = Buffer.from(JSON.stringify(hello), 'utf-8');
        const frame = Buffer.alloc(LENGTH_PREFIX_BYTES + payload.length);

        frame.writeUInt32BE(payload.length, 0);
        payload.copy(frame, LENGTH_PREFIX_BYTES);

        return frame;
    }

    /**
     * Parse a peer HELLO body defensively; null on anything malformed.
     * @param body - the message body bytes
     * @protected
     */
    protected static _parse(body: Buffer): ClusterBootstrapHello | null {
        try {
            const parsed = JSON.parse(body.toString('utf-8')) as {caChain?: unknown; token?: unknown;};

            if (parsed === null || typeof parsed !== 'object' || !Array.isArray(parsed.caChain)) {
                return null;
            }

            const caChain = parsed.caChain.filter((pem): pem is string => typeof pem === 'string' && pem.trim().length > 0);

            if (caChain.length === 0) {
                return null;
            }

            return {
                caChain: caChain,
                token: typeof parsed.token === 'string' ? parsed.token : undefined
            };
        } catch {
            return null;
        }
    }

}
