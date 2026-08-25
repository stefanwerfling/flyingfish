import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../Core/Server/Routes/DefaultReturn.js';
import {
    SchemaCapabilityUiMenu,
    SchemaCapabilityUiPage,
    SchemaCapabilityUiWidget
} from './CapabilityManifest.js';

/**
 * Request identifying a registered part by its instance id (heartbeat / bye).
 */
export const SchemaRegistryInstanceRequest = Vts.object({
    instanceId: Vts.string()
});

/**
 * RegistryInstanceRequest
 */
export type RegistryInstanceRequest = ExtractSchemaResultType<typeof SchemaRegistryInstanceRequest>;

/**
 * Summary of a registered part (status is one of online/degraded/offline).
 */
export const SchemaRegistryPartSummary = Vts.object({
    id: Vts.string(),
    name: Vts.string(),
    instanceId: Vts.string(),
    status: Vts.string(),
    registeredAt: Vts.number(),
    lastHeartbeat: Vts.number(),
    capabilities: Vts.array(Vts.string())
});

/**
 * RegistryPartSummary
 */
export type RegistryPartSummary = ExtractSchemaResultType<typeof SchemaRegistryPartSummary>;

/**
 * Response of the registered-parts list.
 */
export const SchemaRegistryPartsResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaRegistryPartSummary)
});

/**
 * RegistryPartsResponse
 */
export type RegistryPartsResponse = ExtractSchemaResultType<typeof SchemaRegistryPartsResponse>;

/**
 * Response of the aggregated UI contributions of the online parts.
 */
export const SchemaRegistryUiContributionsResponse = SchemaDefaultReturn.extend({
    menu: Vts.array(SchemaCapabilityUiMenu),
    pages: Vts.array(SchemaCapabilityUiPage),
    widgets: Vts.array(SchemaCapabilityUiWidget)
});

/**
 * RegistryUiContributionsResponse
 */
export type RegistryUiContributionsResponse = ExtractSchemaResultType<typeof SchemaRegistryUiContributionsResponse>;