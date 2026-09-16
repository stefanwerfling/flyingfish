import {CapabilityManifest} from './CapabilityManifest.js';

/**
 * Capability manifest for the WAN DHCP-client part (Pi-router epic, Phase 3). It
 * enrolls under the PKI `service` CA purpose for an mTLS Hub identity and
 * self-registers so the Hub knows this node runs the WAN uplink DHCP client. No
 * database and no UI of its own — it runs udhcpc on the WAN interface and reports the
 * lease to the backend's Router API (the UI is a backend concern).
 * @param {string} instanceId - unique id of this WAN node instance
 * @returns {CapabilityManifest}
 */
export const buildWanCapabilityManifest = (instanceId: string): CapabilityManifest => {
    return {
        schemaVersion: '1.0.0',
        part: {
            id: 'wan',
            name: 'FlyingFish WAN DHCP Client',
            version: '1.0.0',
            instanceId: instanceId,
            roles: ['router-wan']
        },
        capabilities: [
            {
                key: 'router-wan',
                version: '1.0.0',
                dependsOn: [],
                health: {
                    endpoint: '/health',
                    interval: 60
                }
            }
        ]
    };
};