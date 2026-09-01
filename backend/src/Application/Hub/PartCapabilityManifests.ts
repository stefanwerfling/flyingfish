import {
    CapabilityManifest,
    buildBackendCapabilityManifest,
    buildDnsCapabilityManifest,
    buildDynDnsCapabilityManifest,
    buildHimHIPCapabilityManifest,
    buildNginxCapabilityManifest,
    buildSshCapabilityManifest
} from 'flyingfish_schemas';
import {HubRegistry} from './HubRegistry.js';

/**
 * Builds a capability manifest for one part instance.
 */
export type PartManifestBuilder = (instanceId: string) => CapabilityManifest;

/**
 * Index of the known FlyingFish service-part capability manifests, keyed by part
 * id. Single enumeration point for the manifests the (later) Hub wiring will
 * register; keeps the per-part builders discoverable instead of orphaned.
 */
export const partCapabilityManifestBuilders: Record<string, PartManifestBuilder> = {
    backend: buildBackendCapabilityManifest,
    nginx: buildNginxCapabilityManifest,
    dns: buildDnsCapabilityManifest,
    ddns: buildDynDnsCapabilityManifest,
    ssh: buildSshCapabilityManifest,
    himhip: buildHimHIPCapabilityManifest
};

/**
 * Build every known part manifest, deriving each instance id from a prefix.
 * @param {string} instanceIdPrefix - prefix for the per-part instance ids
 * @returns {CapabilityManifest[]}
 */
export const buildAllPartCapabilityManifests = (instanceIdPrefix: string = 'local'): CapabilityManifest[] => {
    return Object.entries(partCapabilityManifestBuilders).map(
        ([id, build]) => build(`${instanceIdPrefix}-${id}`)
    );
};

/**
 * Part ids that run in the backend process today (not in their own container),
 * so the backend registers them with the Hub directly at boot instead of them
 * self-POSTing over HTTP. The DNS server used to be co-located here, but it now
 * runs in its own container and self-registers, so only the backend part itself
 * stays co-located. Extend this as more parts stay co-located.
 */
export const COLOCATED_PART_IDS: readonly string[] = ['backend'];

/**
 * Register the co-located parts' manifests into the given Hub registry (called
 * once at backend boot). Each instance id is `<partId>@<prefix>`.
 * @param {HubRegistry} registry - the app-wide Hub registry
 * @param {string} instanceIdPrefix - suffix identifying this backend instance
 */
export const registerColocatedParts = (registry: HubRegistry, instanceIdPrefix: string = 'backend'): void => {
    for (const id of COLOCATED_PART_IDS) {
        const build = partCapabilityManifestBuilders[id];

        if (build) {
            registry.register(build(`${id}@${instanceIdPrefix}`));
        }
    }
};