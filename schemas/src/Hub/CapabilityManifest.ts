import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * How a UI page contributed by a capability is rendered by the Hub frontend.
 * - `schema`: generic UI generated from the referenced VTS config/API schema.
 * - `bundle`: a micro-frontend JS bundle loaded dynamically for complex views.
 */
export enum CapabilityUiRenderType {
    schema = 'schema',
    bundle = 'bundle'
}

/**
 * Descriptor of a registering part (container/service).
 */
export const SchemaPartDescriptor = Vts.object({
    id: Vts.string(),
    name: Vts.string(),
    version: Vts.string(),
    instanceId: Vts.string(),
    roles: Vts.array(Vts.string())
});

/**
 * PartDescriptor
 */
export type PartDescriptor = ExtractSchemaResultType<typeof SchemaPartDescriptor>;

/**
 * A single API action a capability exposes. Either an HTTP `method`+`path` or an
 * event `channel`; `requestSchema`/`responseSchema` reference VTS schema names.
 */
export const SchemaCapabilityApiAction = Vts.object({
    action: Vts.string(),
    method: Vts.optional(Vts.string()),
    channel: Vts.optional(Vts.string()),
    path: Vts.optional(Vts.string()),
    requestSchema: Vts.optional(Vts.string()),
    responseSchema: Vts.optional(Vts.string())
});

/**
 * CapabilityApiAction
 */
export type CapabilityApiAction = ExtractSchemaResultType<typeof SchemaCapabilityApiAction>;

/**
 * A menu entry contributed to the Hub sidebar.
 */
export const SchemaCapabilityUiMenu = Vts.object({
    id: Vts.string(),
    label: Vts.string(),
    icon: Vts.optional(Vts.string()),
    parent: Vts.optional(Vts.string()),
    order: Vts.number()
});

/**
 * A page contributed by a capability.
 */
export const SchemaCapabilityUiPage = Vts.object({
    id: Vts.string(),
    route: Vts.string(),
    menuId: Vts.string(),
    render: Vts.enum(CapabilityUiRenderType),
    ref: Vts.optional(Vts.string()),
    permissions: Vts.array(Vts.string())
});

/**
 * A dialog contributed by a capability (schema-rendered).
 */
export const SchemaCapabilityUiDialog = Vts.object({
    id: Vts.string(),
    schemaRef: Vts.string()
});

/**
 * A dashboard widget contributed by a capability.
 */
export const SchemaCapabilityUiWidget = Vts.object({
    dashboardSlot: Vts.string(),
    ref: Vts.string()
});

/**
 * The UI contributions of a capability.
 */
export const SchemaCapabilityUi = Vts.object({
    menu: Vts.optional(Vts.array(SchemaCapabilityUiMenu)),
    pages: Vts.optional(Vts.array(SchemaCapabilityUiPage)),
    dialogs: Vts.optional(Vts.array(SchemaCapabilityUiDialog)),
    widgets: Vts.optional(Vts.array(SchemaCapabilityUiWidget))
});

/**
 * Reference to the VTS config schema for a capability's settings mask.
 */
export const SchemaCapabilityConfig = Vts.object({
    schemaRef: Vts.string()
});

/**
 * Health-check declaration for a capability.
 */
export const SchemaCapabilityHealth = Vts.object({
    endpoint: Vts.optional(Vts.string()),
    interval: Vts.number()
});

/**
 * A single capability a part provides.
 */
export const SchemaCapability = Vts.object({
    key: Vts.string(),
    version: Vts.string(),
    dependsOn: Vts.array(Vts.string()),
    api: Vts.optional(Vts.array(SchemaCapabilityApiAction)),
    config: Vts.optional(SchemaCapabilityConfig),
    ui: Vts.optional(SchemaCapabilityUi),
    events: Vts.optional(Vts.array(Vts.string())),
    dbEntities: Vts.optional(Vts.array(Vts.string())),
    health: Vts.optional(SchemaCapabilityHealth)
});

/**
 * Capability
 */
export type Capability = ExtractSchemaResultType<typeof SchemaCapability>;

/**
 * The capability manifest a part sends to the Hub on registration. `schemaVersion`
 * enables forward-compatible version negotiation (unknown fields are tolerated).
 */
export const SchemaCapabilityManifest = Vts.object({
    schemaVersion: Vts.string(),
    part: SchemaPartDescriptor,
    capabilities: Vts.array(SchemaCapability)
});

/**
 * CapabilityManifest
 */
export type CapabilityManifest = ExtractSchemaResultType<typeof SchemaCapabilityManifest>;