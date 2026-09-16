import {DomainRecordServiceDB, DomainServiceDB} from 'flyingfish_core';
import {ClusterStateEntry} from 'flyingfish_schemas';
import os from 'os';

/**
 * The DNS record type for an A record (IPv4). The A record's value is this node's
 * answerable IP for the domain, published so the cluster can fail the domain over.
 */
const DNS_TYPE_A = 1;

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
 * Reads a domain's A-record IP on this node (undefined if none); injectable for tests.
 */
export type ClusterDomainIpSource = (domainId: number) => Promise<string | undefined>;

/**
 * Produces the resources this Hub publishes into the cluster gossip (Cluster/Mesh
 * epic 9.5.12): its local clusterserver pulls these, owns them (namespacing the keys
 * by its nodeUid) and gossips them so every node sees a federated view. Keys are
 * Hub-relative. It publishes a hub descriptor and — the first real globally-shared
 * resource (phase 3) — the Hub's domains as `domain:<id>` summaries: name, flags,
 * parent, failover priority, and this node's A-record IP (`ip`) so the cluster can
 * answer a domain's DNS A record with the active node's IP on failover (9.5.14).
 * Records and the other resource types follow in later phases. Kept as its own
 * provider so that extension is one place.
 */
export class ClusterLocalStateProvider {

    private readonly _domains: ClusterDomainSource;

    private readonly _domainIp: ClusterDomainIpSource;

    /**
     * @param domains - the domain source (defaults to the Hub's domain DB)
     * @param domainIp - the domain A-record IP source (defaults to the Hub's record DB)
     */
    public constructor(domains?: ClusterDomainSource, domainIp?: ClusterDomainIpSource) {
        this._domains = domains ?? ((): Promise<ClusterDomainLike[]> => DomainServiceDB.getInstance().findAll());
        this._domainIp = domainIp ?? ClusterLocalStateProvider._defaultDomainIp;
    }

    /**
     * This Hub's publishable state entries.
     */
    public async entries(): Promise<ClusterStateEntry[]> {
        const entries: ClusterStateEntry[] = [
            {key: 'hub', value: {host: os.hostname()}}
        ];

        const domains = await this._domains();
        const withIp = await Promise.all(domains.map(async(domain) => ({domain: domain, ip: await this._domainIp(domain.id)})));

        for (const {domain, ip} of withIp) {
            entries.push({
                key: `domain:${domain.id}`,
                value: {
                    id: domain.id,
                    name: domain.domainname,
                    // Failover priority for this domain on this node (lower = primary),
                    // 9.5.14; the cluster domain view orders nodes by it for DNS failover.
                    priority: domain.cluster_priority,
                    // This node's A-record IP for the domain — the value the cluster's
                    // DNS A record answers with when this node is the active one.
                    ip: ip,
                    disable: domain.disable,
                    fix: domain.fixdomain,
                    recordless: domain.recordless,
                    parentId: domain.parent_id
                }
            });
        }

        return entries;
    }

    /**
     * Read a domain's first A-record value from the Hub's record DB.
     * @param domainId - the domain id
     */
    private static async _defaultDomainIp(domainId: number): Promise<string | undefined> {
        const records = await DomainRecordServiceDB.getInstance().findAllByDomain(domainId);

        return records.find((record) => record.dtype === DNS_TYPE_A)?.dvalue;
    }

}