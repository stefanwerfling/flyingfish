import {CapabilityManifest} from './CapabilityManifest.js';

/**
 * Capability manifest for the Netfilter/NAT router part (Pi-router epic, Phase 2). It
 * enrolls under the PKI `service` CA purpose for an mTLS Hub identity and
 * self-registers so the Hub knows this node applies the router's nftables ruleset +
 * forwarding sysctls (NAT44/NAT66). It carries no database and no user-facing UI of its
 * own — the router config is authored via the backend's Router API (the UI is a backend
 * concern); this part only pulls the resolved config and applies it on the host.
 * @param {string} instanceId - unique id of this netfilter node instance
 * @returns {CapabilityManifest}
 */
export const buildNetfilterCapabilityManifest = (instanceId: string): CapabilityManifest => {
    return {
        schemaVersion: '1.0.0',
        part: {
            id: 'netfilter',
            name: 'FlyingFish Netfilter Router',
            version: '1.0.0',
            instanceId: instanceId,
            roles: ['router-netfilter']
        },
        capabilities: [
            {
                key: 'router-netfilter',
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