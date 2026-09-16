/**
 * The separator between a node's uid and a Hub-relative key in a gossip entry key
 * (Cluster/Mesh epic 9.5.12). A clusterserver owns the resources of its local Hub, so
 * it prefixes each Hub-relative key with its nodeUid to make it cluster-unique; the
 * aggregate readers split it back to learn which node an entry belongs to. A nodeUid
 * is a certificate-fingerprint (no separator), so the first separator is the split.
 */
export const CLUSTER_GOSSIP_KEY_SEPARATOR = '/';

/**
 * Prefix a Hub-relative key with the owning node's uid.
 * @param nodeUid - the owning node's cluster nodeUid
 * @param key - the Hub-relative key
 */
export const clusterGossipNamespaceKey = (nodeUid: string, key: string): string =>
    `${nodeUid}${CLUSTER_GOSSIP_KEY_SEPARATOR}${key}`;

/**
 * Split a namespaced gossip key back into its owning nodeUid and Hub-relative key, or
 * null if it carries no namespace prefix.
 * @param fullKey - the namespaced key
 */
export const clusterGossipParseKey = (fullKey: string): {nodeUid: string; key: string;} | null => {
    const index = fullKey.indexOf(CLUSTER_GOSSIP_KEY_SEPARATOR);

    if (index < 0) {
        return null;
    }

    return {nodeUid: fullKey.slice(0, index), key: fullKey.slice(index + 1)};
};