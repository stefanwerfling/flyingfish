/**
 * The overlay routing table of the cluster mesh (Cluster/Mesh epic 9.5.1, TUN
 * datapath): maps each overlay IP (the stable address a node holds inside the
 * mesh, Tailscale-style) to the nodeUid that owns it, so the datapath can turn a
 * packet's destination address into the peer to forward it to. Populated from the
 * peer roster (each node announces its overlay IP alongside its transport
 * endpoint) and kept in sync as peers come and go. Pure in-memory lookup, no I/O.
 */
export class ClusterRouteTable {

    private readonly _nodeByIp: Map<string, string> = new Map();

    /**
     * Add or update the route to an overlay IP.
     * @param overlayIp - the overlay (mesh) IP, dotted-quad
     * @param nodeUid - the nodeUid that owns it
     */
    public set(overlayIp: string, nodeUid: string): void {
        this._nodeByIp.set(overlayIp, nodeUid);
    }

    /**
     * The nodeUid that owns an overlay IP, or undefined if unrouted.
     * @param overlayIp - the destination overlay IP, dotted-quad
     */
    public lookup(overlayIp: string): string | undefined {
        return this._nodeByIp.get(overlayIp);
    }

    /**
     * Remove the route to an overlay IP.
     * @param overlayIp - the overlay IP to drop
     */
    public remove(overlayIp: string): boolean {
        return this._nodeByIp.delete(overlayIp);
    }

    /**
     * The number of routes currently held.
     */
    public size(): number {
        return this._nodeByIp.size;
    }

    /**
     * Drop all routes.
     */
    public clear(): void {
        this._nodeByIp.clear();
    }

}