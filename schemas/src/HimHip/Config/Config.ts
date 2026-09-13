import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';
import {SchemaConfigDbOptionsRedis} from '../../Core/Config/ConfigDb.js';

/**
 * SchemaConfigOptionsHimHip
 */
export const SchemaConfigOptionsHimHip = SchemaConfigOptions.extend({
    redis: Vts.optional(SchemaConfigDbOptionsRedis),
    // Hub registry (v2 modular architecture): where and with which shared secret
    // this part self-registers its capability manifest.
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
        // Either a static bootstrap token or a bootstrap socket to fetch one from
        // (co-located trust, 9.4.3-D); at least one is needed to enroll.
        bootstrapToken: Vts.optional(Vts.string()),
        bootstrapSocket: Vts.optional(Vts.string()),
        storeDir: Vts.optional(Vts.string()),
        commonName: Vts.optional(Vts.string())
    }))
});

/**
 * ConfigOptionsHimHip
 */
export type ConfigOptionsHimHip = ExtractSchemaResultType<typeof SchemaConfigOptionsHimHip>;