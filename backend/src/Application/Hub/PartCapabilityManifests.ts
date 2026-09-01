import {CapabilityManifest} from 'flyingfish_schemas';
import {buildDnsCapabilityManifest} from '../../inc/Dns/DnsCapabilityManifest.js';
import {buildDynDnsCapabilityManifest} from '../../inc/DynDns/DynDnsCapabilityManifest.js';
import {buildHimHIPCapabilityManifest} from '../../inc/HimHIP/HimHIPCapabilityManifest.js';
import {buildNginxCapabilityManifest} from '../../inc/Nginx/NginxCapabilityManifest.js';
import {buildSshCapabilityManifest} from '../../inc/Ssh/SshCapabilityManifest.js';

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