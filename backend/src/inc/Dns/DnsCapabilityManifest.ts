import {CapabilityManifest, CapabilityUiRenderType} from 'flyingfish_schemas';

/**
 * Capability manifest for the DNS part (v2 modular architecture, DNS pilot).
 *
 * This is the declaration the DNS part will send to the Hub on registration. It
 * is built per running instance (each container passes its own `instanceId`).
 * The API paths / schemaRefs are the contract the Hub gateway routes and
 * validates against; the UI block drives the dynamic frontend contribution.
 * @param {string} instanceId - unique id of this DNS part instance
 * @returns {CapabilityManifest}
 */
export const buildDnsCapabilityManifest = (instanceId: string): CapabilityManifest => {
    return {
        schemaVersion: '1.0.0',
        part: {
            id: 'dns',
            name: 'FlyingFish DNS Server',
            version: '1.0.0',
            instanceId: instanceId,
            roles: ['dns-server']
        },
        capabilities: [
            {
                key: 'dns-server',
                version: '1.0.0',
                dependsOn: [],
                api: [
                    {
                        action: 'zone-record-list',
                        method: 'GET',
                        path: '/dns/records',
                        responseSchema: 'SchemaDomainListResponse'
                    },
                    {
                        action: 'zone-record-save',
                        method: 'POST',
                        path: '/dns/records/save',
                        requestSchema: 'SchemaDomainRecordSave',
                        responseSchema: 'SchemaDefaultReturn'
                    },
                    {
                        action: 'zone-record-delete',
                        method: 'POST',
                        path: '/dns/records/delete',
                        requestSchema: 'SchemaDomainRecordDelete',
                        responseSchema: 'SchemaDefaultReturn'
                    }
                ],
                config: {
                    schemaRef: 'dns-server-config'
                },
                ui: {
                    menu: [
                        {
                            id: 'dns',
                            label: 'DNS',
                            icon: 'dns',
                            order: 40
                        }
                    ],
                    pages: [
                        {
                            id: 'dns-records',
                            route: '/dns',
                            menuId: 'dns',
                            render: CapabilityUiRenderType.schema,
                            ref: 'dns-records',
                            permissions: ['dns:read']
                        }
                    ]
                },
                events: [],
                dbEntities: ['DomainRecord'],
                health: {
                    endpoint: '/health',
                    interval: 30
                }
            }
        ]
    };
};