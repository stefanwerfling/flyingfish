import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';

/**
 * SchemaConfigOptionsClusterServer — configuration for the cluster control part
 * (Cluster/Mesh epic 9.5). Unlike the other parts this one is database-free: it
 * only needs its own HTTP port, the optional Hub registry self-registration, and
 * the optional node PKI enrollment (under the `cluster` CA purpose). The mesh
 * datapath (TUN) is a separate container, so no NET_ADMIN/native config here.
 */
export const SchemaConfigOptionsClusterServer = SchemaConfigOptions.extend({
    clusterserver: Vts.optional(Vts.object({
        port: Vts.optional(Vts.number())
    })),
    // Mesh peer transport (Cluster/Mesh epic 9.5.1). The data plane lives in the
    // dedicated clusterdatapath node now, so clusterserver is control-only by
    // default: it only joins the mesh when `mesh` is explicitly true (kept for
    // testing / a combined node). When active, it announces its peer endpoint to
    // the Hub roster so other cluster nodes can dial it.
    cluster: Vts.optional(Vts.object({
        // Opt clusterserver into the data-plane mesh (default off — control-only).
        mesh: Vts.optional(Vts.boolean()),
        // Peer transport wire: 'tls' (raw TCP-TLS, the default) or 'wss' (WebSocket
        // over HTTPS/443 — the NAT-/firewall-friendly fallback). Both authenticate
        // identically with the cluster node-cert.
        transport: Vts.optional(Vts.string()),
        peerPort: Vts.optional(Vts.number()),
        advertiseHost: Vts.optional(Vts.string()),
        syncIntervalMs: Vts.optional(Vts.number())
    })),
    // Hub registry (v2 modular architecture): where and with which shared secret
    // this node self-registers its capability manifest (authenticated over mTLS
    // once the node PKI identity below is obtained).
    registry: Vts.optional(Vts.object({
        url: Vts.string(),
        secret: Vts.string()
    })),
    // Node PKI (own-PKI epic 9.4): enroll + auto-renew this node's own cluster
    // certificate — the verifiable cluster identity (flyingfish://cluster/<nodeUid>)
    // the mesh (9.5.1) and cluster management (9.5.12) build on.
    pki: Vts.optional(Vts.object({
        url: Vts.string(),
        bootstrapToken: Vts.optional(Vts.string()),
        bootstrapSocket: Vts.optional(Vts.string()),
        storeDir: Vts.optional(Vts.string()),
        commonName: Vts.optional(Vts.string()),
        // Shared admin secret to validate a joining peer's bootstrap token against the
        // local pkiserver's /pki/token/validate route (9.5.12.2 accept side).
        tokenSecret: Vts.optional(Vts.string())
    })),
    flyingfish_libpath: Vts.optional(Vts.string())
});

/**
 * ConfigOptionsClusterServer
 */
export type ConfigOptionsClusterServer = ExtractSchemaResultType<typeof SchemaConfigOptionsClusterServer>;