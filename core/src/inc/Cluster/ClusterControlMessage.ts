/**
 * The two cluster-control message kinds (Cluster/Mesh epic 9.5.12, A+C synchronous
 * cross-node write path): a REQUEST asks a peer to apply a named operation, and a
 * REPLY carries that request's outcome (ok + payload, or an error), correlated by the
 * request `id`.
 */
export enum ClusterControlMessageType {
    Request = 'req',
    Reply = 'rep'
}

/**
 * A decoded cluster-control message — a discriminated union on
 * {@link ClusterControlMessageType}. `id` correlates a reply with its request; it is
 * unique only within the requesting node's {@link ClusterControl} instance.
 */
export type ClusterControlMessage =
    | {type: ClusterControlMessageType.Request; id: number; method: string; payload: unknown;}
    | {type: ClusterControlMessageType.Reply; id: number; ok: boolean; payload?: unknown; error?: string;};

/**
 * Encodes and decodes cluster-control messages (Cluster/Mesh epic 9.5.12). Control
 * traffic is low-frequency, structured control-plane RPC carrying arbitrary JSON
 * payloads, so the wire form is JSON (UTF-8) like the gossip codec. {@link
 * ClusterControlCodec.decode} returns null on anything malformed or of an unknown
 * shape, so a peer can never crash the engine.
 */
export class ClusterControlCodec {

    /**
     * Encode a control message to bytes.
     * @param message - the message
     */
    public static encode(message: ClusterControlMessage): Uint8Array {
        return new Uint8Array(Buffer.from(JSON.stringify(message), 'utf8'));
    }

    /**
     * Decode a control message, or null if malformed / not a recognised shape.
     * @param bytes - the raw message bytes (kind byte already stripped by the mux)
     */
    public static decode(bytes: Uint8Array): ClusterControlMessage | null {
        let parsed: unknown;

        try {
            parsed = JSON.parse(Buffer.from(bytes).toString('utf8'));
        } catch {
            return null;
        }

        if (typeof parsed !== 'object' || parsed === null) {
            return null;
        }

        const message = parsed as Record<string, unknown>;

        if (message.type === ClusterControlMessageType.Request) {
            if (typeof message.id === 'number' && typeof message.method === 'string') {
                return {type: ClusterControlMessageType.Request, id: message.id, method: message.method, payload: message.payload};
            }

            return null;
        }

        if (message.type === ClusterControlMessageType.Reply) {
            if (typeof message.id === 'number' && typeof message.ok === 'boolean') {
                return {
                    type: ClusterControlMessageType.Reply,
                    id: message.id,
                    ok: message.ok,
                    payload: message.payload,
                    error: typeof message.error === 'string' ? message.error : undefined
                };
            }

            return null;
        }

        return null;
    }

}