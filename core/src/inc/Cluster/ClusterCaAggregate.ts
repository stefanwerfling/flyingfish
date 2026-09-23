import {X509Certificate} from 'crypto';
import {ClusterGossipStateEntry} from './HubClusterGossipSync.js';

/**
 * Gossip key prefix under which each node publishes its own CA chain so the whole
 * cluster converges on the set of member CAs (Cluster/Mesh epic 9.5.12.2, model (b)
 * CA cross-trust). Un-namespaced (like the `node:` descriptor) so every node shares
 * one converged set.
 */
export const CLUSTER_CA_KEY_PREFIX = 'ca:';

/**
 * One cluster member's CA, as published into the gossip. In the federated trust
 * model (b) every node keeps its OWN CA and gossips its CA chain; each node's mesh
 * trust anchor set is the union of all members' chains, so a peer's leaf (signed by
 * its own CA) verifies everywhere without any node re-homing under a founder CA.
 */
export type ClusterCaEntry = {
    nodeUid: string;
    // The node's CA chain (intermediate(s) + root) that its cluster leaf chains to —
    // exactly what a verifier needs as trust anchors to admit this node's peer cert.
    chain: string[];
    // SHA-256 fingerprint of the chain's root, for out-of-band pinning in the join
    // package (a joining node pins this before trusting a received CA).
    rootFingerprint: string;
};

/**
 * The published value shape of a member-CA descriptor (all fields defensive-read).
 */
type CaEntryValue = {
    nodeUid?: unknown;
    chain?: unknown;
    rootFingerprint?: unknown;
};

/**
 * Build the cluster-wide member-CA set from the gossip aggregate (model (b)): every
 * `ca:<uid>` descriptor, last-writer-per-uid, malformed dropped, ordered by nodeUid
 * for stability. This is the read model behind the dynamic mesh trust anchor set —
 * purely a projection of the converged gossip, no central authority.
 * @param entries - the cluster-wide aggregate entries
 */
export const aggregateClusterCaSet = (
    entries: readonly ClusterGossipStateEntry[]
): ClusterCaEntry[] => {
    const byUid = new Map<string, ClusterCaEntry>();

    for (const entry of entries) {
        if (!entry.key.startsWith(CLUSTER_CA_KEY_PREFIX)) {
            continue;
        }

        const value = entry.value as CaEntryValue;

        if (value === null || typeof value !== 'object' ||
            typeof value.nodeUid !== 'string' || !Array.isArray(value.chain)) {
            continue;
        }

        const chain = value.chain.filter((pem): pem is string => typeof pem === 'string' && pem.trim().length > 0);

        if (chain.length === 0) {
            continue;
        }

        byUid.set(value.nodeUid, {
            nodeUid: value.nodeUid,
            chain: chain,
            rootFingerprint: typeof value.rootFingerprint === 'string' ? value.rootFingerprint : ''
        });
    }

    return Array.from(byUid.values()).sort((a, b) => a.nodeUid.localeCompare(b.nodeUid));
};

/**
 * The SHA-256 fingerprint of a CA chain's root (its last element), used both to
 * publish a node's own CA pin (the seed descriptor + join package) and to verify a
 * peer's presented CA against a pinned fingerprint during the bootstrap handshake
 * (Cluster/Mesh epic 9.5.12.2). Returns an empty string for an empty chain.
 * @param chain - the CA chain (root last)
 */
export const caChainRootFingerprint = (chain: readonly string[]): string => {
    if (chain.length === 0) {
        return '';
    }

    return new X509Certificate(chain[chain.length - 1]).fingerprint256;
};

/**
 * The mesh trust anchor set: the de-duplicated union of every member CA chain (plus
 * this node's own chain, in case its own `ca:` descriptor has not converged back
 * yet). This is what the peer transports verify inbound/outbound peer certificates
 * against in model (b) — it grows as nodes join and shrinks as they leave.
 * @param caSet - the aggregated member-CA set
 * @param ownChain - this node's own CA chain (always trusted)
 */
export const clusterTrustChain = (caSet: readonly ClusterCaEntry[], ownChain: readonly string[] = []): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];

    for (const pem of [...ownChain, ...caSet.flatMap((entry) => entry.chain)]) {
        const norm = pem.trim();

        if (norm.length === 0 || seen.has(norm)) {
            continue;
        }

        seen.add(norm);
        out.push(pem);
    }

    return out;
};
