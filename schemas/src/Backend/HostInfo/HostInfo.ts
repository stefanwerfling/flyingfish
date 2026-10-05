import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * HimHIPData
 */
export const SchemaHimHIPData = Vts.object({
    gatewaymac: Vts.string(),
    network: Vts.string(),
    gateway: Vts.string(),
    interface: Vts.string(),
    hostip: Vts.string()
});

/**
 * HimHIPData
 */
export type HimHIPData = ExtractSchemaResultType<typeof SchemaHimHIPData>;