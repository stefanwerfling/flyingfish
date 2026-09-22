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
