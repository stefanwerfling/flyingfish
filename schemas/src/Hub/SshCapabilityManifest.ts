import {CapabilityManifest, CapabilityUiRenderType} from './CapabilityManifest.js';

/**
 * Capability manifest for the SSH part (v2 modular architecture).
 *
 * This is the declaration the SSH part will send to the Hub on registration. It
 * is built per running instance (each container passes its own `instanceId`).
 * Unlike the DNS and nginx parts, the SSH part is primarily a tunnel server
 * driven by an IPC event: it consumes the `ssh_config_changed` Redis channel
 * the backend publishes on route (stream/ssh) save/delete, so it is modelled
 * here as an event action + the `events` list, alongside its single read HTTP
 * action. The paths/schemaRefs mirror the current backend contract under the
 * part-namespaced `/ssh/*` gateway paths.
 * @param {string} instanceId - unique id of this SSH part instance
 * @returns {CapabilityManifest}
 */
export const buildSshCapabilityManifest = (instanceId: string): CapabilityManifest => {
    return {
        schemaVersion: '1.0.0',
        part: {
            id: 'ssh',
            name: 'FlyingFish SSH Server',
            version: '1.0.0',
            instanceId: instanceId,
            roles: ['ssh-server']
        },
        capabilities: [
            {
                key: 'ssh-server',
                version: '1.0.0',
                dependsOn: [],
                api: [
                    {
                        action: 'ssh-port-list',
                        method: 'GET',
                        path: '/ssh/list',
                        responseSchema: 'SchemaSshPortListResponse'
                    },
                    {
                        action: 'ssh-config-changed',
                        channel: 'ssh_config_changed',
                        requestSchema: 'SchemaSshConfigChanged'
                    }
                ],
                config: {
                    schemaRef: 'ssh-server-config'
                },
                ui: {
                    menu: [
                        {
                            id: 'ssh',
                            label: 'SSH',
                            icon: 'terminal',
                            order: 50
                        }
                    ],
                    pages: [
                        {
                            id: 'ssh-ports',
                            route: '/ssh',
                            menuId: 'ssh',
                            render: CapabilityUiRenderType.schema,
                            ref: 'ssh-ports',
                            permissions: ['ssh:read']
                        }
                    ]
                },
                events: ['ssh_config_changed'],
                dbEntities: ['SshPort', 'SshUser'],
                health: {
                    endpoint: '/health',
                    interval: 30
                }
            }
        ]
    };
};