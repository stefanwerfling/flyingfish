import {CapabilityManifest} from './CapabilityManifest.js';

/**
 * Capability manifest for the HimHIP part (v2 modular architecture).
 *
 * HimHIP is a background host-info collector: it has no HTTP API, no database
 * and no user-facing UI. It talks to the backend purely over Redis, consuming
 * `himhip_update_request` and publishing `himhip_update_response`. It is
 * therefore modelled as a UI-less, DB-less, event-only capability — the
 * minimal shape a registering part can take. Built per running instance.
 * Purely additive: declaration only, no runtime wiring.
 * @param {string} instanceId - unique id of this HimHIP part instance
 * @returns {CapabilityManifest}
 */
export const buildHimHIPCapabilityManifest = (instanceId: string): CapabilityManifest => {
    return {
        schemaVersion: '1.0.0',
        part: {
            id: 'himhip',
            name: 'FlyingFish HimHIP',
            version: '1.0.0',
            instanceId: instanceId,
            roles: ['host-info']
        },
        capabilities: [
            {
                key: 'himhip',
                version: '1.0.0',
                dependsOn: [],
                api: [
                    {
                        action: 'himhip-update-request',
                        channel: 'himhip_update_request',
                        requestSchema: 'SchemaHimHIPUpdate'
                    },
                    {
                        action: 'himhip-update-response',
                        channel: 'himhip_update_response',
                        responseSchema: 'SchemaHimHIPData'
                    }
                ],
                config: {
                    schemaRef: 'himhip-config'
                },
                events: ['himhip_update_request', 'himhip_update_response'],
                health: {
                    interval: 60
                }
            }
        ]
    };
};