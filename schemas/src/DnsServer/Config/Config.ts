import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';
import {SchemaConfigDbOptions} from '../../Core/Config/ConfigDb.js';

/**
 * SchemaConfigOptionsDnsServer
 */
export const SchemaConfigOptionsDnsServer = SchemaConfigOptions.extend({
    db: SchemaConfigDbOptions,
    dnsserver: Vts.optional(Vts.object({
        port: Vts.optional(Vts.number()),
        // Parse the PROXY protocol (v1/v2) on incoming DNS connections so the real
        // client IP (from a fronting nginx stream with `proxy_protocol on`) is used
        // instead of the proxy's IP. Only enable when actually behind such a proxy.
        proxyProtocol: Vts.optional(Vts.boolean())
    })),
    // Hub registry (v2 modular architecture): where and with which shared secret
    // this part self-registers its capability manifest (wired in a later slice).
    registry: Vts.optional(Vts.object({
        url: Vts.string(),
        secret: Vts.string()
    })),
    // Node PKI (v2 own-PKI epic 9.4, 9.4.3-D): opt-in enroll + auto-renew of this
    // part's own service certificate. `url` is the pkiserver base URL,
    // `bootstrapToken` authorizes the initial enrollment, `storeDir` is a writable
    // path for the node identity (defaults to <libpath>/pki — set it to a writable
    // volume, the shared flyingfish volume is mounted read-only in the parts).
    pki: Vts.optional(Vts.object({
        url: Vts.string(),
        bootstrapToken: Vts.string(),
        storeDir: Vts.optional(Vts.string()),
        commonName: Vts.optional(Vts.string())
    })),
    flyingfish_libpath: Vts.optional(Vts.string())
});

/**
 * ConfigOptionsDnsServer
 */
export type ConfigOptionsDnsServer = ExtractSchemaResultType<typeof SchemaConfigOptionsDnsServer>;