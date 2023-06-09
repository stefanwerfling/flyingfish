import {Vts} from 'vts';

/**
 * Schema logger config
 */
export const SchemaLoggerConfig = Vts.object({
    dirname: Vts.optional(Vts.string()),
    filename: Vts.optional(Vts.string()),
    zippedArchive: Vts.optional(Vts.boolean()),
    maxSize: Vts.optional(Vts.string()),
    maxFiles: Vts.optional(Vts.string()),
    enableConsole: Vts.optional(Vts.boolean()),
    level: Vts.optional(Vts.string())
});