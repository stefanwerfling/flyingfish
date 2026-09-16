import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';

/**
 * SchemaConfigOptionsLan — configuration for the LAN DHCP/RA-server part (Pi-router
 * epic, Phase 4). Database-free: it pulls the resolved LAN config from the Hub, runs
 * dnsmasq (DHCP + IPv6 RA, no DNS) on the LAN interface and reports the active leases
 * back. Needs a PKI identity + the registry, plus a reconcile interval.
 */
export const SchemaConfigOptionsLan = SchemaConfigOptions.extend({
    lan: Vts.optional(Vts.object({
        // How often (ms) to re-pull the resolved LAN config and reconcile dnsmasq.
        reconcileIntervalMs: Vts.optional(Vts.number())
    })),
    registry: Vts.optional(Vts.object({
        url: Vts.string(),
        secret: Vts.string()
    })),
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
 * ConfigOptionsLan
 */
export type ConfigOptionsLan = ExtractSchemaResultType<typeof SchemaConfigOptionsLan>;