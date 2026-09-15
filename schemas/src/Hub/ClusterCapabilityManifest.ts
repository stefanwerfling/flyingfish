import {CapabilityManifest} from './CapabilityManifest.js';

/**
 * Capability manifest for the Cluster part (v2 modular architecture, Cluster/Mesh
 * epic 9.5). The clusterserver is a control part: it enrolls under the PKI
 * `cluster` CA purpose to obtain a verifiable node identity
 * (flyingfish://cluster/&lt;nodeUid&gt;) and self-registers here so the Hub knows
 * this node. It carries no database and no user-facing UI yet (the Proxmox-style
 * cluster-management UI is 9.5.12, the mesh datapath is its own container). The
 * only endpoint is a read-only status of this node's cluster identity.
 * @param {string} instanceId - unique id of this cluster node instance
 * @returns {CapabilityManifest}
 */
export const buildClusterCapabilityManifest = (instanceId: string): CapabilityManifest => {
    return {
        schemaVersion: '1.0.0',
        part: {
            id: 'cluster',
            name: 'FlyingFish Cluster Node',
            version: '1.0.0',
            instanceId: instanceId,
            roles: ['cluster-node']
        },
        capabilities: [
            {
                key: 'cluster-node',
                version: '1.0.0',
                dependsOn: [],
                api: [
                    {
                        action: 'cluster-status',
                        method: 'GET',
                        path: '/cluster/status',
                        responseSchema: 'SchemaClusterStatusResponse'
                    }
                ],
                health: {
                    endpoint: '/health',
                    interval: 60
                }
            }
        ]
    };
};