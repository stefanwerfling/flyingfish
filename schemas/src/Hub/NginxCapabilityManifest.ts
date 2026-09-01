import {CapabilityManifest, CapabilityUiRenderType} from './CapabilityManifest.js';

/**
 * Capability manifest for the nginx part (v2 modular architecture).
 *
 * This is the declaration the nginx part will send to the Hub on registration
 * once nginx (+ Letsencrypt, CDN) is split into its own container (roadmap
 * 9.2.2). It is built per running instance (each container passes its own
 * `instanceId`). The API paths / schemaRefs mirror the current backend
 * contract (Listen + Route controllers) but under the part-namespaced gateway
 * paths the Hub will route; the UI block drives the dynamic frontend
 * contribution. Unlike the single-capability DNS part, nginx exposes two
 * capabilities (listen management and routing).
 * @param {string} instanceId - unique id of this nginx part instance
 * @returns {CapabilityManifest}
 */
export const buildNginxCapabilityManifest = (instanceId: string): CapabilityManifest => {
    return {
        schemaVersion: '1.0.0',
        part: {
            id: 'nginx',
            name: 'FlyingFish Nginx',
            version: '1.0.0',
            instanceId: instanceId,
            roles: ['nginx', 'reverse-proxy']
        },
        capabilities: [
            {
                key: 'nginx-listen',
                version: '1.0.0',
                dependsOn: [],
                api: [
                    {
                        action: 'listen-list',
                        method: 'GET',
                        path: '/nginx/listen/list',
                        responseSchema: 'SchemaListenResponse'
                    },
                    {
                        action: 'listen-save',
                        method: 'POST',
                        path: '/nginx/listen/save',
                        requestSchema: 'SchemaListenData',
                        responseSchema: 'SchemaDefaultReturn'
                    },
                    {
                        action: 'listen-delete',
                        method: 'POST',
                        path: '/nginx/listen/delete',
                        requestSchema: 'SchemaListenDelete',
                        responseSchema: 'SchemaDefaultReturn'
                    }
                ],
                config: {
                    schemaRef: 'nginx-listen-config'
                },
                ui: {
                    menu: [
                        {
                            id: 'nginx',
                            label: 'Nginx',
                            icon: 'server',
                            order: 10
                        }
                    ],
                    pages: [
                        {
                            id: 'nginx-listens',
                            route: '/nginx/listens',
                            menuId: 'nginx',
                            render: CapabilityUiRenderType.schema,
                            ref: 'listens',
                            permissions: ['nginx:read']
                        }
                    ]
                },
                events: [],
                dbEntities: ['NginxListen', 'NginxListenVariable'],
                health: {
                    endpoint: '/health',
                    interval: 30
                }
            },
            {
                key: 'nginx-routing',
                version: '1.0.0',
                dependsOn: ['nginx-listen'],
                api: [
                    {
                        action: 'route-list',
                        method: 'GET',
                        path: '/nginx/route/list',
                        responseSchema: 'SchemaRoutesResponse'
                    },
                    {
                        action: 'route-http-save',
                        method: 'POST',
                        path: '/nginx/route/http/save',
                        requestSchema: 'SchemaRouteHttpSave',
                        responseSchema: 'SchemaDefaultReturn'
                    },
                    {
                        action: 'route-http-delete',
                        method: 'POST',
                        path: '/nginx/route/http/delete',
                        requestSchema: 'SchemaRouteHttpDelete',
                        responseSchema: 'SchemaDefaultReturn'
                    },
                    {
                        action: 'route-stream-save',
                        method: 'POST',
                        path: '/nginx/route/stream/save',
                        requestSchema: 'SchemaRouteStreamSave',
                        responseSchema: 'SchemaDefaultReturn'
                    },
                    {
                        action: 'route-stream-delete',
                        method: 'POST',
                        path: '/nginx/route/stream/delete',
                        requestSchema: 'SchemaRouteStreamDelete',
                        responseSchema: 'SchemaDefaultReturn'
                    }
                ],
                config: {
                    schemaRef: 'nginx-routing-config'
                },
                ui: {
                    pages: [
                        {
                            id: 'nginx-routes',
                            route: '/nginx/routes',
                            menuId: 'nginx',
                            render: CapabilityUiRenderType.schema,
                            ref: 'routes',
                            permissions: ['nginx:read']
                        }
                    ]
                },
                events: [],
                dbEntities: ['NginxHttp', 'NginxLocation', 'NginxStream', 'NginxUpstream'],
                health: {
                    endpoint: '/health',
                    interval: 30
                }
            }
        ]
    };
};