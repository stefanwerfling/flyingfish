/**
 * One revoked node identity plus when it was revoked (epoch ms).
 */
export type PkiRevocationEntry = {
    nodeUid: string;
    revokedAt: number;
};

/**
 * In-memory revocation list for the real-time Hub allowlist (own-PKI epic 9.4,
 * revocation 9.4.4). Leaves are short-lived, so the primary revocation mechanism
 * is denying a revoked node identity at mTLS in real time rather than a slow CRL.
 * The Hub holds this list in memory and rebuilds it from the durable
 * issued_certificate.revoked rows on boot; CRL/OCSP is a backup for longer-lived
 * trust (later slice).
 *
 * Keyed by the stable nodeUid: revoking a node denies every certificate carrying
 * its flyingfish://<purpose>/<nodeUid> identity, across renewals.
 */
export class PkiRevocationList {

    /**
     * revoked nodeUid -> revocation timestamp (epoch ms).
     */
    private readonly _revoked: Map<string, number> = new Map();

    /**
     * Revoke a node identity. Idempotent; a later call keeps the first
     * revocation time.
     * @param nodeUid - the stable node identity to revoke
     * @param revokedAt - the revocation timestamp (epoch ms)
     */
    public revoke(nodeUid: string, revokedAt: number): void {
        if (!this._revoked.has(nodeUid)) {
            this._revoked.set(nodeUid, revokedAt);
        }
    }

    /**
     * Whether a node identity is revoked (the real-time allowlist check).
     * @param nodeUid - the node identity to test
     */
    public isRevoked(nodeUid: string): boolean {
        return this._revoked.has(nodeUid);
    }

    /**
     * Rebuild the list from the durable revocation records (called on Hub boot).
     * Replaces the current contents.
     * @param entries - the persisted revocation entries
     */
    public load(entries: PkiRevocationEntry[]): void {
        this._revoked.clear();

        for (const entry of entries) {
            this._revoked.set(entry.nodeUid, entry.revokedAt);
        }
    }

    /**
     * The current revocation entries.
     */
    public list(): PkiRevocationEntry[] {
        return Array.from(this._revoked.entries()).map(([nodeUid, revokedAt]) => {
            return {
                nodeUid: nodeUid,
                revokedAt: revokedAt
            };
        });
    }

    /**
     * The number of revoked identities.
     */
    public size(): number {
        return this._revoked.size;
    }

    /**
     * Drop all entries.
     */
    public clear(): void {
        this._revoked.clear();
    }

}