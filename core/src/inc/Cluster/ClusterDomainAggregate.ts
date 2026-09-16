import {ClusterGossipStateEntry} from './HubClusterGossipSync.js';
import {clusterGossipParseKey} from './ClusterGossipNamespace.js';

/**
 * The Hub-relative key prefix of a published domain entry.
 */
const DOMAIN_KEY_PREFIX = 'domain:';

/**
 * One node's involvement with a domain (Cluster/Mesh epic 9.5.12): which node holds
 * it (its local domain id + flags) and at what `priority` it manages the domain.
 * Lower priority = earlier in the failover order (the primary), so a DNS A record can
 * fail over to the next node when the current one is down.
 */
export type ClusterDomainNode = {
    nodeUid: string;
    id: number;
    priority: number;
    disable: boolean;
    fix: boolean;
    recordless: boolean;
    parentId: number;
};

/**
 * A domain seen across the cluster: its name and every node that manages it, in
 * failover priority order.
 */
export type ClusterDomainView = {
    name: string;
    nodes: ClusterDomainNode[];
};

/**
 * The published value shape of a domain entry (all fields defensive-read).
 */
type DomainEntryValue = {
    id?: unknown;
    name?: unknown;
    priority?: unknown;
    disable?: unknown;
    fix?: unknown;
    recordless?: unknown;
    parentId?: unknown;
};

/**
 * Coerce an unknown to a finite number, defaulting to 0.
 * @param value - the value
 */
const toNumber = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? value : 0;

/**
 * Group the cluster gossip aggregate into a per-domain view (Cluster/Mesh epic
 * 9.5.12): a domain is identified cluster-wide by its NAME (local ids differ per
 * node), so every node that published a `domain:<id>` entry for the same name is
 * collected under it — making it recognisable which nodes all manage a domain. Each
 * domain's nodes are ordered by priority (then nodeUid) so the DNS failover order is
 * explicit. Non-domain entries (hub descriptors, etc.) and malformed values are
 * ignored.
 * @param entries - the cluster-wide aggregate entries (namespaced keys)
 */
export const aggregateClusterDomains = (entries: readonly ClusterGossipStateEntry[]): ClusterDomainView[] => {
    const byName = new Map<string, ClusterDomainView>();

    for (const entry of entries) {
        const parsed = clusterGossipParseKey(entry.key);

        if (parsed === null || !parsed.key.startsWith(DOMAIN_KEY_PREFIX)) {
            continue;
        }

        const value = entry.value as DomainEntryValue;

        if (value === null || typeof value !== 'object' || typeof value.name !== 'string') {
            continue;
        }

        const view = byName.get(value.name) ?? {name: value.name, nodes: []};

        view.nodes.push({
            nodeUid: parsed.nodeUid,
            id: toNumber(value.id),
            priority: toNumber(value.priority),
            disable: value.disable === true,
            fix: value.fix === true,
            recordless: value.recordless === true,
            parentId: toNumber(value.parentId)
        });

        byName.set(value.name, view);
    }

    for (const view of byName.values()) {
        view.nodes.sort((a, b) => a.priority === b.priority ? a.nodeUid.localeCompare(b.nodeUid) : a.priority - b.priority);
    }

    return Array.from(byName.values());
};

/**
 * Resolve the node that should currently manage a domain (Cluster/Mesh epic 9.5.14,
 * DNS failover): the first node in priority order that is live and not disabled. When
 * the primary (lowest priority) node is down, this returns the next-priority live node
 * — so the domain's DNS A record can follow it. Returns null if no live node manages
 * the domain. Pure — liveness is injected (from the gossip node roster / peer TTL).
 * @param view - the domain's cluster view (nodes already priority-ordered)
 * @param liveNodeUids - the set of currently-live node uids
 */
export const resolveDomainActiveNode = (view: ClusterDomainView, liveNodeUids: ReadonlySet<string>): ClusterDomainNode | null => {
    for (const node of view.nodes) {
        if (!node.disable && liveNodeUids.has(node.nodeUid)) {
            return node;
        }
    }

    return null;
};