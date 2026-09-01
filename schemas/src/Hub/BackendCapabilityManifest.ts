import {CapabilityManifest, CapabilityUiRenderType} from './CapabilityManifest.js';

/**
 * Capability manifest for the backend part itself (v2 modular architecture).
 *
 * The backend is also a part: besides hosting the Hub it owns the core admin
 * capabilities (dashboard, credentials, users, settings). It registers this
 * manifest in-process at boot (co-located part). API paths/schemaRefs mirror the
 * real backend controllers under the part-namespaced /backend/* gateway paths.
 * Purely additive: declaration only, no runtime wiring.
 * @param {string} instanceId - unique id of this backend part instance
 * @returns {CapabilityManifest}
 */
export const buildBackendCapabilityManifest = (instanceId: string): CapabilityManifest => {
    return {
        schemaVersion: '1.0.0',
        part: {
            id: 'backend',
            name: 'FlyingFish Backend',
            version: '1.0.0',
            instanceId: instanceId,
            roles: ['backend', 'hub']
        },
        capabilities: [
            {
                key: 'dashboard',
                version: '1.0.0',
                dependsOn: [],
                api: [
                    {
                        action: 'dashboard-info',
                        method: 'GET',
                        path: '/backend/dashboard/info',
                        responseSchema: 'SchemaDashboardInfoResponse'
                    }
                ],
                ui: {
                    menu: [
                        {
                            id: 'dashboard',
                            label: 'Dashboard',
                            icon: 'tachometer-alt',
                            order: 5
                        }
                    ],
                    pages: [
                        {
                            id: 'dashboard',
                            route: '/backend/dashboard',
                            menuId: 'dashboard',
                            render: CapabilityUiRenderType.schema,
                            ref: 'dashboard',
                            permissions: ['dashboard:read']
                        }
                    ]
                },
                events: [],
                health: {
                    endpoint: '/health',
                    interval: 30
                }
            },
            {
                key: 'credentials',
                version: '1.0.0',
                dependsOn: [],
                api: [
                    {
                        action: 'credential-list',
                        method: 'GET',
                        path: '/backend/credential/list',
                        responseSchema: 'SchemaCredentialResponse'
                    },
                    {
                        action: 'credential-provider-list',
                        method: 'GET',
                        path: '/backend/credential/provider/list',
                        responseSchema: 'SchemaCredentialProviderResponse'
                    },
                    {
                        action: 'credential-save',
                        method: 'POST',
                        path: '/backend/credential/save',
                        requestSchema: 'SchemaCredential',
                        responseSchema: 'SchemaDefaultReturn'
                    }
                ],
                ui: {
                    menu: [
                        {
                            id: 'credential',
                            label: 'Credential',
                            icon: 'book',
                            order: 20
                        }
                    ],
                    pages: [
                        {
                            id: 'credential',
                            route: '/backend/credential',
                            menuId: 'credential',
                            render: CapabilityUiRenderType.schema,
                            ref: 'credential',
                            permissions: ['credential:read']
                        }
                    ]
                },
                events: [],
                dbEntities: ['Credential', 'CredentialUser', 'CredentialLocation'],
                health: {
                    endpoint: '/health',
                    interval: 30
                }
            },
            {
                key: 'settings',
                version: '1.0.0',
                dependsOn: [],
                api: [
                    {
                        action: 'settings-list',
                        method: 'GET',
                        path: '/backend/settings/list',
                        responseSchema: 'SchemaSettingsResponse'
                    },
                    {
                        action: 'settings-save',
                        method: 'POST',
                        path: '/backend/settings/save',
                        requestSchema: 'SchemaSettingsList',
                        responseSchema: 'SchemaDefaultReturn'
                    }
                ],
                ui: {
                    menu: [
                        {
                            id: 'settings',
                            label: 'Settings',
                            icon: 'cogs',
                            order: 90
                        }
                    ],
                    pages: [
                        {
                            id: 'settings',
                            route: '/backend/settings',
                            menuId: 'settings',
                            render: CapabilityUiRenderType.schema,
                            ref: 'settings',
                            permissions: ['settings:read']
                        }
                    ]
                },
                events: [],
                dbEntities: ['Settings'],
                health: {
                    endpoint: '/health',
                    interval: 30
                }
            },
            {
                key: 'users',
                version: '1.0.0',
                dependsOn: ['settings'],
                api: [
                    {
                        action: 'user-info',
                        method: 'GET',
                        path: '/backend/user/info',
                        responseSchema: 'SchemaUserInfoResponse'
                    },
                    {
                        action: 'user-list',
                        method: 'GET',
                        path: '/backend/user/list',
                        responseSchema: 'SchemaUserListResponse'
                    },
                    {
                        action: 'user-save',
                        method: 'POST',
                        path: '/backend/user/save',
                        requestSchema: 'SchemaUserEntry',
                        responseSchema: 'SchemaDefaultReturn'
                    }
                ],
                ui: {
                    menu: [
                        {
                            id: 'users-settings',
                            label: 'Users',
                            icon: 'users',
                            parent: 'settings',
                            order: 95
                        }
                    ],
                    pages: [
                        {
                            id: 'users',
                            route: '/backend/users',
                            menuId: 'users-settings',
                            render: CapabilityUiRenderType.schema,
                            ref: 'users',
                            permissions: ['users:read']
                        }
                    ]
                },
                events: [],
                dbEntities: ['User'],
                health: {
                    endpoint: '/health',
                    interval: 30
                }
            }
        ]
    };
};