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
        organization: Vts.optional(Vts.string())
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