import {CapabilityManifest} from './CapabilityManifest.js';

/**
 * Capability manifest for the LAN DHCP/RA-server part (Pi-router epic, Phase 4). It
 * enrolls under the PKI `service` CA purpose for an mTLS Hub identity and
 * self-registers so the Hub knows this node runs the LAN DHCP server. No database and
 * no UI of its own — it runs dnsmasq (DHCP + IPv6 RA, no DNS) on the LAN interface from
 * the config authored via the backend's Router API, and reports the active leases.
 * @param {string} instanceId - unique id of this LAN node instance
 * @returns {CapabilityManifest}
 */
export const buildLanCapabilityManifest = (instanceId: string): CapabilityManifest => {
    return {
        schemaVersion: '1.0.0',
        part: {
            id: 'lan',
            name: 'FlyingFish LAN DHCP Server',
            version: '1.0.0',
            instanceId: instanceId,
            roles: ['router-lan']
        },
        capabilities: [
            {
                key: 'router-lan',
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