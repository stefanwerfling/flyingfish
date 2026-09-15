import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';

/**
 * SchemaConfigOptionsClusterDatapath — configuration for the cluster DATA-PLANE
 * node (Cluster/Mesh epic 9.5.1). Unlike the clusterserver control part, this node
 * is its own mesh participant with its own PKI cluster identity: it runs the peer
 * transport, opens a TUN device (needs CAP_NET_ADMIN, its own privileged
 * container) and forwards L3 traffic over the mesh. Database-free.
 */
export const SchemaConfigOptionsClusterDatapath = SchemaConfigOptions.extend({
    clusterdatapath: Vts.optional(Vts.object({
        port: Vts.optional(Vts.number())
    })),
    // Hub registry: where + with which shared secret this node announces its peer
    // endpoint and reads the roster of the other datapath nodes.
    registry: Vts.optional(Vts.object({
        url: Vts.string(),
        secret: Vts.string()
    })),
    // Node PKI (own-PKI epic 9.4): enroll + auto-renew this node's own cluster
    // certificate — its verifiable mesh identity (flyingfish://cluster/<nodeUid>).
    pki: Vts.optional(Vts.object({
        url: Vts.string(),
        bootstrapToken: Vts.optional(Vts.string()),
        bootstrapSocket: Vts.optional(Vts.string()),
        storeDir: Vts.optional(Vts.string()),
        commonName: Vts.optional(Vts.string())
    })),
    // Mesh data plane: the peer transport wire + endpoint, and this node's overlay
    // IP (assigned to the TUN interface and announced so peers route to it).
    cluster: Vts.optional(Vts.object({
        transport: Vts.optional(Vts.string()),
        peerPort: Vts.optional(Vts.number()),
        advertiseHost: Vts.optional(Vts.string()),
        syncIntervalMs: Vts.optional(Vts.number()),
        overlayIp: Vts.optional(Vts.string()),
        overlayNetmask: Vts.optional(Vts.string()),
        tunName: Vts.optional(Vts.string())
    })),
    flyingfish_libpath: Vts.optional(Vts.string())
});

/**
 * ConfigOptionsClusterDatapath
 */
export type ConfigOptionsClusterDatapath = ExtractSchemaResultType<typeof SchemaConfigOptionsClusterDatapath>;