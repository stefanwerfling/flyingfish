import {ClusterGossipEntry, ClusterGossipVersion} from './ClusterGossipStore.js';

/**
 * The three anti-entropy message kinds (Cluster/Mesh epic 9.5.12): a node offers a
 * DIGEST (key→version, no values), the peer answers with ENTRIES it is newer on and
 * REQUESTs the keys the digest is newer on, and the request is answered with ENTRIES.
 */
export enum ClusterGossipMessageType {
    Digest = 'digest',
    Entries = 'entries',
    Request = 'request'
}

/**
 * One key→version pair of a digest.
 */
export type ClusterGossipDigestItem = {
    key: string;
    version: ClusterGossipVersion;
};

/**
 * A decoded gossip message — a discriminated union on {@link ClusterGossipMessageType}.
 */
export type ClusterGossipMessage =
    | {type: ClusterGossipMessageType.Digest; digest: ClusterGossipDigestItem[];}
    | {type: ClusterGossipMessageType.Entries; entries: ClusterGossipEntry[];}
    | {type: ClusterGossipMessageType.Request; keys: string[];};

/**
 * Encodes and decodes gossip messages (Cluster/Mesh epic 9.5.12). Gossip is
 * low-frequency, structured control-plane traffic carrying arbitrary JSON values, so
 * the wire form is JSON (UTF-8) rather than a hand-packed binary frame. {@link
 * ClusterGossipCodec.decode} returns null on anything malformed or of an unknown
 * shape, so a peer can never crash the engine.
 */
export class ClusterGossipCodec {

    /**
     * Encode a gossip message to bytes.
     * @param message - the message
     */
    public static encode(message: ClusterGossipMessage): Uint8Array {
        return new Uint8Array(Buffer.from(JSON.stringify(message), 'utf8'));
    }

    /**
     * Decode a gossip message, or null if malformed / not a recognised shape.
     * @param bytes - the raw message bytes (kind byte already stripped by the mux)
     */
    public static decode(bytes: Uint8Array): ClusterGossipMessage | null {
        let parsed: unknown;

        try {
            parsed = JSON.parse(Buffer.from(bytes).toString('utf8'));
        } catch {
            return null;
        }

        if (typeof parsed !== 'object' || parsed === null) {
            return null;
        }

        const message = parsed as {type?: unknown; digest?: unknown; entries?: unknown; keys?: unknown;};

        switch (message.type) {
            case ClusterGossipMessageType.Digest:
                return Array.isArray(message.digest)
                    ? {type: ClusterGossipMessageType.Digest, digest: message.digest as ClusterGossipDigestItem[]}
                    : null;

            case ClusterGossipMessageType.Entries:
                return Array.isArray(message.entries)
                    ? {type: ClusterGossipMessageType.Entries, entries: message.entries as ClusterGossipEntry[]}
                    : null;

            case ClusterGossipMessageType.Request:
                return Array.isArray(message.keys)
                    ? {type: ClusterGossipMessageType.Request, keys: message.keys as string[]}
                    : null;

            default:
                return null;
        }
    }

}