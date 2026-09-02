import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';
import {SchemaConfigDbOptions} from '../../Core/Config/ConfigDb.js';

/**
 * SchemaBackendConfigOptions
 */
export const SchemaBackendConfigOptions = SchemaConfigOptions.extend({
    db: SchemaConfigDbOptions,
    httpserver: Vts.object({
        port: Vts.optional(Vts.number()),
        publicdir: Vts.string(),
        session: Vts.optional(Vts.object({
            secret: Vts.optional(Vts.string()),
            cookie_path: Vts.optional(Vts.string()),
            cookie_max_age: Vts.optional(Vts.number())
        })),
        sslpath: Vts.optional(Vts.string())
    }),
    nginx: Vts.optional(Vts.object({
        config: Vts.string(),
        prefix: Vts.string(),
        dhparamfile: Vts.optional(Vts.string()),
        module_mode_dyn: Vts.optional(Vts.boolean()),
        secret: Vts.optional(Vts.string()),
        // When set, nginx runs in its own container (9.2.2): the backend drives
        // start/stop/reload/test through the control agent at this URL instead of
        // spawning nginx locally. Authed with `secret`.
        remote_url: Vts.optional(Vts.string())
    })),
    sshserver: Vts.optional(Vts.object({
        ip: Vts.string()
    })),
    docker: Vts.optional(Vts.object({
        inside: Vts.boolean(),
        gateway: Vts.optional(Vts.string())
    })),
    upnpnat: Vts.optional(Vts.object({
        enable: Vts.boolean()
    })),
    dyndnsclient: Vts.optional(Vts.object({
        enable: Vts.boolean()
    })),
    dyndnsserver: Vts.optional(Vts.object({
        enable: Vts.boolean(),
        ip: Vts.string(),
        port: Vts.number(),
        schema: Vts.string()
    })),
    dnsserver: Vts.optional(Vts.object({
        port: Vts.optional(Vts.number())
    })),
    // Hub registry (v2 modular architecture): the shared secret parts use to
    // authenticate their self-registration (ServiceAuth seam, step 5.3). Interim
    // until per-service PKI/mTLS (epic 9.4) replaces it. Shared across the
    // backend and the part containers via FLYINGFISH_REGISTRY_SECRET.
    registry: Vts.optional(Vts.object({
        secret: Vts.optional(Vts.string())
    })),
    himpip: Vts.optional(Vts.object({
        provider: Vts.string()
    })),
    // Retained for backward compatibility with existing config files only: since
    // HimHIP became Redis-only (phase 3) nothing reads use/secret anymore. Vts
    // rejects unknown keys, so the field must stay optional to keep older
    // config.json files valid; it is no longer populated from defaults or env.
    himhip: Vts.optional(Vts.object({
        use: Vts.boolean(),
        secret: Vts.string()
    })),
    flyingfish_libpath: Vts.optional(Vts.string())
});

/**
 * BackendConfigOptions
 */
export type BackendConfigOptions = ExtractSchemaResultType<typeof SchemaBackendConfigOptions>;