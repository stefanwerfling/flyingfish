import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';

/**
 * SchemaConfigOptionsWan — configuration for the WAN DHCP-client part (Pi-router epic,
 * Phase 3). Database-free: it pulls the resolved config from the Hub (to learn the WAN
 * interface), runs the WAN DHCP client (udhcpc) on the host and reports the obtained
 * lease back to the Hub. Needs a PKI identity + the registry, plus a reconcile interval.
 */
export const SchemaConfigOptionsWan = SchemaConfigOptions.extend({
    wan: Vts.optional(Vts.object({
        // How often (ms) to re-pull the resolved config (WAN interface) and reconcile.
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
 * ConfigOptionsWan
 */
export type ConfigOptionsWan = ExtractSchemaResultType<typeof SchemaConfigOptionsWan>;