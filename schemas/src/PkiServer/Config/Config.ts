import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';
import {SchemaConfigDbOptions} from '../../Core/Config/ConfigDb.js';

/**
 * SchemaConfigOptionsPkiServer — configuration for the PKI part container
 * (own-PKI epic 9.4). Mirrors the DNS server config: the shared database, an
 * own HTTP port, and the optional Hub registry self-registration.
 */
export const SchemaConfigOptionsPkiServer = SchemaConfigOptions.extend({
    db: SchemaConfigDbOptions,
    pkiserver: Vts.optional(Vts.object({
        port: Vts.optional(Vts.number()),
        // The O= put into every distinguished name of the CA tree created on
        // first boot. Defaults to 'FlyingFish'.
        organization: Vts.optional(Vts.string()),
        // Unix socket path for the local bootstrap-token vending server. When set,
        // co-located parts fetch a single-use enrollment token over this socket
        // (trust by co-location) instead of a pre-shared token (9.4.3-D).
        bootstrapSocket: Vts.optional(Vts.string()),
        // File path (in a shared volume) to export the CA pool to (root +
        // intermediates, JSON). The Hub reads it to seed its mTLS client CA
        // without a boot-time HTTP dependency on the pkiserver (9.4 mTLS).
        caExportFile: Vts.optional(Vts.string())
    })),
    // Hub registry (v2 modular architecture): where and with which shared secret
    // this part self-registers its capability manifest.
    registry: Vts.optional(Vts.object({
        url: Vts.string(),
        secret: Vts.string()
    })),
    flyingfish_libpath: Vts.optional(Vts.string())
});

/**
 * ConfigOptionsPkiServer
 */
export type ConfigOptionsPkiServer = ExtractSchemaResultType<typeof SchemaConfigOptionsPkiServer>;