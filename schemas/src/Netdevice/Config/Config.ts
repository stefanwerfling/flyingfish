import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';

/**
 * SchemaConfigOptionsNetdevice — configuration for the network-device router part
 * (Pi-router epic, Phase 3+4, merged). Database-free: one part manages the host NICs by
 * their role — it runs the WAN DHCP client (udhcpc) on the `wan`-role interface and the
 * LAN DHCP/RA server (dnsmasq) on the `lan`-role interface, pulling both from the Hub
 * and reporting the WAN lease + LAN leases back. Needs a PKI identity + the registry,
 * plus a reconcile interval.
 */
export const SchemaConfigOptionsNetdevice = SchemaConfigOptions.extend({
    netdevice: Vts.optional(Vts.object({
        // How often (ms) to re-pull the resolved config and reconcile udhcpc + dnsmasq.
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
 * ConfigOptionsNetdevice
 */
export type ConfigOptionsNetdevice = ExtractSchemaResultType<typeof SchemaConfigOptionsNetdevice>;