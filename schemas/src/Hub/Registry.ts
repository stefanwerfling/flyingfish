import {ExtractSchemaResultType, Vts} from 'vts';

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