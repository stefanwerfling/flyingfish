import {CapabilityManifest} from './CapabilityManifest.js';

/**
 * Capability manifest for the network-device router part (Pi-router epic, Phase 3+4,
 * merged). One part manages the host NICs by role: it enrolls under the PKI `service`
 * CA purpose for an mTLS Hub identity and self-registers so the Hub knows this node
 * runs the WAN DHCP client (udhcpc) and the LAN DHCP/RA server (dnsmasq). No database
 * and no UI of its own — config is authored via the backend's Router API.
 * @param {string} instanceId - unique id of this netdevice node instance
 * @returns {CapabilityManifest}
 */
export const buildNetdeviceCapabilityManifest = (instanceId: string): CapabilityManifest => {
    return {
        schemaVersion: '1.0.0',
        part: {
            id: 'netdevice',
            name: 'FlyingFish Network Devices',
            version: '1.0.0',
            instanceId: instanceId,
            roles: ['router-netdevice']
        },
        capabilities: [
            {
                key: 'router-netdevice',
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