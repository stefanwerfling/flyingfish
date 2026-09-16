import {DomainServiceDB} from 'flyingfish_core';
import {ClusterStateEntry} from 'flyingfish_schemas';
import os from 'os';

/**
 * The domain fields this Hub publishes into the cluster view.
 */
export type ClusterDomainLike = {
    id: number;
    domainname: string;
    disable: boolean;
    fixdomain: boolean;
    recordless: boolean;
    parent_id: number;
    cluster_priority: number;
};

/**
 * Reads the Hub's domains; injectable so the provider is testable without a database.
 */
export type ClusterDomainSource = () => Promise<ClusterDomainLike[]>;

/**
 * Produces the resources this Hub publishes into the cluster gossip (Cluster/Mesh
 * epic 9.5.12): its local clusterserver pulls these, owns them (namespacing the keys
 * by its nodeUid) and gossips them so every node sees a federated view. Keys are
 * Hub-relative. It publishes a hub descriptor and — the first real globally-shared
 * resource (phase 3) — the Hub's domains as `domain:<id>` summaries (name + flags +
 * parent), so domains are cluster-wide known. Records and the other resource types
 * follow in later phases. Kept as its own provider so that extension is one place.
 */
export class ClusterLocalStateProvider {

    private readonly _domains: ClusterDomainSource;

    /**
     * @param domains - the domain source (defaults to the Hub's domain DB)
     */
    public constructor(domains?: ClusterDomainSource) {
        this._domains = domains ?? ((): Promise<ClusterDomainLike[]> => DomainServiceDB.getInstance().findAll());
    }

    /**
     * This Hub's publishable state entries.
     */
    public async entries(): Promise<ClusterStateEntry[]> {
        const entries: ClusterStateEntry[] = [
            {key: 'hub', value: {host: os.hostname()}}
        ];

        for (const domain of await this._domains()) {
            entries.push({
                key: `domain:${domain.id}`,
                value: {
                    id: domain.id,
                    name: domain.domainname,
                    // Failover priority for this domain on this node (lower = primary),
                    // 9.5.14; the cluster domain view orders nodes by it for DNS failover.
                    priority: domain.cluster_priority,
                    disable: domain.disable,
                    fix: domain.fixdomain,
                    recordless: domain.recordless,
                    parentId: domain.parent_id
                }
            });
        }

        return entries;
    }

}