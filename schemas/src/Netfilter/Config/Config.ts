import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';

/**
 * SchemaConfigOptionsNetfilter — configuration for the netfilter/NAT router part
 * (Pi-router epic, Phase 2). Database-free: it pulls the resolved netfilter config
 * from the Hub (backend) over the registry, and applies the nftables ruleset +
 * forwarding sysctls on the host network. Needs a PKI identity + the registry, plus a
 * reconcile interval.
 */
export const SchemaConfigOptionsNetfilter = SchemaConfigOptions.extend({
    netfilter: Vts.optional(Vts.object({
        // How often (ms) to re-pull the resolved config and reconcile the ruleset.
        reconcileIntervalMs: Vts.optional(Vts.number())
    })),
    // Hub registry: where + with which shared secret this part registers and pulls the
    // resolved netfilter config (`/json/router/netfilter-config`).
    registry: Vts.optional(Vts.object({
        url: Vts.string(),
        secret: Vts.string()
    })),
    // Node PKI (own-PKI epic 9.4): enroll + auto-renew this node's own service
    // certificate for mTLS Hub registration.
    pki: Vts.optional(Vts.object({
        url: Vts.string(),
        bootstrapToken: Vts.optional(Vts.string()),
        bootstrapSocket: Vts.optional(Vts.string()),
        storeDir: Vts.optional(Vts.string()),
        commonName: Vts.optional(Vts.string())
    })),
    flyingfish_libpath: Vts.optional(Vts.string())
});

/**
 * ConfigOptionsNetfilter
 */
export type ConfigOptionsNetfilter = ExtractSchemaResultType<typeof SchemaConfigOptionsNetfilter>;