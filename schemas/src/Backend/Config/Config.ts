import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigDbOptions, SchemaConfigOptions} from '../../Core/Config/Config.js';

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
        secret: Vts.optional(Vts.string())
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
    dnsserver: Vts.optional(Vts.object({
        port: Vts.optional(Vts.number())
    })),
    himpip: Vts.optional(Vts.object({
        provider: Vts.string()
    })),
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