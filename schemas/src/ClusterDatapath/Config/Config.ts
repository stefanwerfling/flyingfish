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
    // L4 tunnels (Cluster/Mesh epic 9.5.2): expose an arbitrary TCP/UDP service that
    // lives on (or behind) another cluster node. Each rule binds a local ingress
    // port and forwards every connection over the mesh to `egressNodeUid`, which
    // dials `targetHost:targetPort`. Needs no TUN/privilege — it rides the peer link.
    tunnels: Vts.optional(Vts.array(Vts.object({
        proto: Vts.optional(Vts.string()),
        listenHost: Vts.optional(Vts.string()),
        listenPort: Vts.number(),
        egressNodeUid: Vts.string(),
        targetHost: Vts.string(),
        targetPort: Vts.number(),
        // Preserve the client IP end-to-end (9.5.3): when true, the egress prepends a
        // PROXY protocol v2 header to the backend connection (the backend must expect
        // it, e.g. nginx `proxy_protocol`).
        proxyProtocol: Vts.optional(Vts.boolean())
    }))),
    flyingfish_libpath: Vts.optional(Vts.string())
});

/**
 * ConfigOptionsClusterDatapath
 */
export type ConfigOptionsClusterDatapath = ExtractSchemaResultType<typeof SchemaConfigOptionsClusterDatapath>;