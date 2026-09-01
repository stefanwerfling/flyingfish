import {CapabilityManifest, CapabilityUiRenderType} from './CapabilityManifest.js';

/**
 * Capability manifest for the DynDNS server part (v2 modular architecture).
 *
 * Built per running instance (each container passes its own `instanceId`). The
 * dyndns-server capability combines the public dynamic-DNS update protocol
 * (the dyndns2 `/nic/update` and the simple `/update`, served by the ddnsserver
 * container) with the admin management API (currently the backend
 * DynDnsServer controller). Paths/schemaRefs mirror the real contract under the
 * part-namespaced `/ddns/*` gateway paths. Purely additive: declaration only.
 * @param {string} instanceId - unique id of this DynDNS server part instance
 * @returns {CapabilityManifest}
 */
export const buildDynDnsCapabilityManifest = (instanceId: string): CapabilityManifest => {
    return {
        schemaVersion: '1.0.0',
        part: {
            id: 'ddns',
            name: 'FlyingFish DynDNS Server',
            version: '1.0.0',
            instanceId: instanceId,
            roles: ['dyndns-server']
        },
        capabilities: [
            {
                key: 'dyndns-server',
                version: '1.0.0',
                dependsOn: [],
                api: [
                    {
                        action: 'nic-update',
                        method: 'GET',
                        path: '/ddns/nic/update',
                        requestSchema: 'SchemaRequestData'
                    },
                    {
                        action: 'update',
                        method: 'GET',
                        path: '/ddns/update'
                    },
                    {
                        action: 'server-list',
                        method: 'GET',
                        path: '/ddns/list',
                        responseSchema: 'SchemaDynDnsServerListResponse'
                    },
                    {
                        action: 'server-domain-list',
                        method: 'GET',
                        path: '/ddns/domain/list',
                        responseSchema: 'SchemaDynDnsServerNotInDomainResponse'
                    },
                    {
                        action: 'server-save',
                        method: 'POST',
                        path: '/ddns/save',
                        requestSchema: 'SchemaDynDnsServerData',
                        responseSchema: 'SchemaDefaultReturn'
                    },
                    {
                        action: 'server-delete',
                        method: 'POST',
                        path: '/ddns/delete',
                        requestSchema: 'SchemaDynDnsServerData',
                        responseSchema: 'SchemaDefaultReturn'
                    }
                ],
                config: {
                    schemaRef: 'dyndns-server-config'
                },
                ui: {
                    menu: [
                        {
                            id: 'ddns',
                            label: 'DynDNS',
                            icon: 'refresh',
                            order: 45
                        }
                    ],
                    pages: [
                        {
                            id: 'ddns-server',
                            route: '/ddns',
                            menuId: 'ddns',
                            render: CapabilityUiRenderType.schema,
                            ref: 'dyndns-server',
                            permissions: ['ddns:read']
                        }
                    ]
                },
                events: [],
                dbEntities: ['DynDnsServerDomain', 'DynDnsServerUser', 'Domain', 'DomainRecord'],
                health: {
                    endpoint: '/health',
                    interval: 30
                }
            }
        ]
    };
};