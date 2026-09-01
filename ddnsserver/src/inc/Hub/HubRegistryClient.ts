import {Logger} from 'figtree';
import {CapabilityManifest} from 'flyingfish_schemas';

/**
 * Header the Hub registry expects the shared part-registration secret in.
 * Must match the backend guard (FlyingFishRouteCheckServiceOrUserLogin).
 */
const REGISTRY_SECRET_HEADER = 'x-flyingfish-registry-secret';

/**
 * Announce a part to the Hub registry by POSTing its capability manifest to the
 * backend register endpoint, authenticated with the shared registry secret
 * (ServiceAuth seam, step 5.3 - interim until per-service PKI over mTLS-WSS).
 *
 * Non-fatal by design: the service keeps running even if the hub is unreachable
 * or rejects the registration, so a missing/late hub never brings the part down.
 * @param {string} url - base URL of the backend hub (e.g. http://backend:3000)
 * @param {string} secret - shared registry secret
 * @param {CapabilityManifest} manifest - this part's capability manifest
 */
export const registerWithHub = async(
    url: string,
    secret: string,
    manifest: CapabilityManifest
): Promise<void> => {
    const endpoint = `${url.replace(/\/+$/u, '')}/json/registry/register`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                [REGISTRY_SECRET_HEADER]: secret
            },
            body: JSON.stringify(manifest)
        });

        if (response.ok) {
            Logger.getLogger().info(
                'HubRegistryClient: registered part "%s" (%s) with the hub',
                manifest.part.id,
                manifest.part.instanceId
            );
        } else {
            Logger.getLogger().warn(
                'HubRegistryClient: hub registration returned HTTP %d for part "%s"',
                response.status,
                manifest.part.id
            );
        }
    } catch (error) {
        Logger.getLogger().warn(
            'HubRegistryClient: could not reach the hub registry at %s',
            endpoint,
            error
        );
    }
};