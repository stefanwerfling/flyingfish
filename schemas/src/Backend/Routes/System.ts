import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../Core/Server/Routes/DefaultReturn.js';

/**
 * System DTOs — the node's operating mode + target settings (Attach/Router epic).
 * Node-LOCAL singleton. `mode` is `attach` (single interface) or `router` (WAN + LAN);
 * `target_ip` is an optional reachable-address override ('' = auto-derive);
 * `attach_interface` names the NIC used in attach mode ('' = host default route).
 */
export const SchemaSystemConfigEntry = Vts.object({
    mode: Vts.string(),
    target_ip: Vts.string(),
    attach_interface: Vts.string()
});

/**
 * The node's system config.
 */
export type SystemConfigEntry = ExtractSchemaResultType<typeof SchemaSystemConfigEntry>;

/**
 * GET response with the node's system config.
 */
export const SchemaSystemConfigResponse = SchemaDefaultReturn.extend({
    config: SchemaSystemConfigEntry
});

/**
 * SystemConfigResponse
 */
export type SystemConfigResponse = ExtractSchemaResultType<typeof SchemaSystemConfigResponse>;

/**
 * The node's RESOLVED effective config: the single reachable target IP downstream parts
 * (the DNS server's follow-node records) should point at, plus the operating mode. Empty
 * `target_ip` means the node's address is not resolvable yet (no override, no host facts).
 * Served registry-secret guarded for service parts.
 */
export const SchemaSystemEffectiveConfigResponse = SchemaDefaultReturn.extend({
    mode: Vts.string(),
    target_ip: Vts.string()
});

/**
 * SystemEffectiveConfigResponse
 */
export type SystemEffectiveConfigResponse = ExtractSchemaResultType<typeof SchemaSystemEffectiveConfigResponse>;

/**
 * Save request for the node's system config (mode required, targets optional).
 */
export const SchemaSystemConfigSaveRequest = Vts.object({
    mode: Vts.string(),
    target_ip: Vts.optional(Vts.string()),
    attach_interface: Vts.optional(Vts.string())
});

/**
 * SystemConfigSaveRequest
 */
export type SystemConfigSaveRequest = ExtractSchemaResultType<typeof SchemaSystemConfigSaveRequest>;
