import {CapabilityManifest, CapabilityUiRenderType} from './CapabilityManifest.js';

/**
 * Capability manifest for the PKI part (v2 modular architecture, own-PKI epic
 * 9.4). This is the declaration the PKI part container sends to the Hub on
 * registration; it is built per running instance (each container passes its own
 * `instanceId`).
 *
 * The API block is the EST-style enrollment contract the Hub gateway routes and
 * validates against: `/pki/cacerts` returns the CA chain (EST cacerts) and
 * `/pki/enroll` consumes a CSR + bootstrap token; admin approve/reject drive the
 * pending-request state machine. The UI block contributes the certificate tree
 * view (CaCertificate self-reference = the CA tree).
 * @param {string} instanceId - unique id of this PKI part instance
 * @returns {CapabilityManifest}
 */
export const buildPkiCapabilityManifest = (instanceId: string): CapabilityManifest => {
    return {
        schemaVersion: '1.0.0',
        part: {
            id: 'pki',
            name: 'FlyingFish PKI Server',
            version: '1.0.0',
            instanceId: instanceId,
            roles: ['pki-server']
        },
        capabilities: [
            {
                key: 'pki-server',
                version: '1.0.0',
                dependsOn: [],
                api: [
                    {
                        action: 'pki-cacerts',
                        method: 'GET',
                        path: '/pki/cacerts',
                        responseSchema: 'SchemaPkiCaCertsResponse'
                    },
                    {
                        action: 'pki-enroll',
                        method: 'POST',
                        path: '/pki/enroll',
                        requestSchema: 'SchemaPkiEnrollRequest',
                        responseSchema: 'SchemaPkiEnrollResponse'
                    },
                    {
                        action: 'pki-enroll-approve',
                        method: 'POST',
                        path: '/pki/enroll/approve',
                        requestSchema: 'SchemaPkiEnrollDecision',
                        responseSchema: 'SchemaPkiEnrollResponse'
                    },
                    {
                        action: 'pki-enroll-reject',
                        method: 'POST',
                        path: '/pki/enroll/reject',
                        requestSchema: 'SchemaPkiEnrollDecision',
                        responseSchema: 'SchemaDefaultReturn'
                    }
                ],
                config: {
                    schemaRef: 'pki-server-config'
                },
                ui: {
                    menu: [
                        {
                            id: 'pki',
                            label: 'PKI',
                            icon: 'lock',
                            order: 60
                        }
                    ],
                    pages: [
                        {
                            id: 'pki-certificates',
                            route: '/pki',
                            menuId: 'pki',
                            render: CapabilityUiRenderType.schema,
                            ref: 'pki-certificates',
                            permissions: ['pki:read']
                        }
                    ]
                },
                events: [],
                dbEntities: ['CaCertificate', 'IssuedCertificate', 'EnrollmentRequest'],
                health: {
                    endpoint: '/health',
                    interval: 30
                }
            }
        ]
    };
};