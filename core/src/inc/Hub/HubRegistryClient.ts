import {Logger} from 'figtree';
import {CapabilityManifest, StatusCodes} from 'flyingfish_schemas';
import process from 'process';

/**
 * Header the Hub registry expects the shared part-registration secret in.
 * Must match the backend guard (FlyingFishRouteCheckServiceOrUserLogin).
 */
const REGISTRY_SECRET_HEADER = 'x-flyingfish-registry-secret';

/**
 * Default heartbeat interval. Must stay well below the registry's degraded
 * threshold (60s) so a part never drops to degraded/offline while alive.
 */
const DEFAULT_HEARTBEAT_MS = 30000;

/**
 * Options for {@link startHubRegistration}.
 */
export type HubRegistrationOptions = {
    heartbeatMs?: number;
};

/**
 * Handle for a running registration lifecycle: stop clears the heartbeat and
 * sends a graceful bye.
 */
export type HubRegistrationHandle = {
    stop: () => Promise<void>;
};

/**
 * POST to a registry endpoint, authenticated with the shared secret. Returns the
 * response `statusCode` from the body, or null on a transport error / non-2xx.
 * Non-fatal: never throws.
 */
const postRegistry = async(
    url: string,
    secret: string,
    endpoint: 'register' | 'heartbeat' | 'bye',
    body: unknown
): Promise<string | null> => {
    const target = `${url.replace(/\/+$/u, '')}/json/registry/${endpoint}`;

    try {
        const response = await fetch(target, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                [REGISTRY_SECRET_HEADER]: secret
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            Logger.getLogger().warn('HubRegistryClient: %s returned HTTP %d', endpoint, response.status);
            return null;
        }

        const data = await response.json() as {statusCode?: string;};

        return data.statusCode ?? null;
    } catch (error) {
        Logger.getLogger().warn('HubRegistryClient: could not reach the hub registry (%s)', endpoint, error);
        return null;
    }
};

/**
 * Register (or re-register) a part by POSTing its capability manifest.
 * @param {string} url - base URL of the backend hub
 * @param {string} secret - shared registry secret
 * @param {CapabilityManifest} manifest - this part's capability manifest
 * @returns {Promise<boolean>} true when the hub accepted the registration
 */
export const registerWithHub = async(
    url: string,
    secret: string,
    manifest: CapabilityManifest
): Promise<boolean> => {
    const ok = await postRegistry(url, secret, 'register', manifest) === StatusCodes.OK;

    if (ok) {
        Logger.getLogger().info(
            'HubRegistryClient: registered part "%s" (%s) with the hub',
            manifest.part.id,
            manifest.part.instanceId
        );
    }

    return ok;
};

/**
 * Send a heartbeat for a registered part.
 * @returns {Promise<boolean>} true when the part is still known to the hub
 */
export const heartbeatHub = async(url: string, secret: string, instanceId: string): Promise<boolean> => {
    return await postRegistry(url, secret, 'heartbeat', {instanceId: instanceId}) === StatusCodes.OK;
};

/**
 * Deregister a part (graceful shutdown).
 */
export const byeHub = async(url: string, secret: string, instanceId: string): Promise<void> => {
    await postRegistry(url, secret, 'bye', {instanceId: instanceId});
};

/**
 * Run the full registration lifecycle for a part: register once, then heartbeat
 * on an interval, and send a graceful bye on SIGTERM/SIGINT. If a heartbeat
 * reports the part as unknown (e.g. the backend restarted and lost its in-memory
 * registry), it re-registers. The heartbeat timer is unref'd so it never keeps
 * an otherwise-idle process alive. Non-fatal throughout.
 * @param {string} url - base URL of the backend hub
 * @param {string} secret - shared registry secret
 * @param {CapabilityManifest} manifest - this part's capability manifest
 * @param {HubRegistrationOptions} options - heartbeat interval override
 * @returns {Promise<HubRegistrationHandle>}
 */
export const startHubRegistration = async(
    url: string,
    secret: string,
    manifest: CapabilityManifest,
    options: HubRegistrationOptions = {}
): Promise<HubRegistrationHandle> => {
    const instanceId = manifest.part.instanceId;
    const heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;

    await registerWithHub(url, secret, manifest);

    const beat = async(): Promise<void> => {
        const alive = await heartbeatHub(url, secret, instanceId);

        if (!alive) {
            // Backend may have restarted and lost its in-memory registry.
            await registerWithHub(url, secret, manifest);
        }
    };

    // postRegistry never rejects (it catches transport errors), so the beat
    // promise is safe to leave unawaited here.
    const timer = setInterval((): void => {
        beat();
    }, heartbeatMs);

    timer.unref();

    const onShutdown = (): void => {
        byeHub(url, secret, instanceId);
    };

    process.once('SIGTERM', onShutdown);
    process.once('SIGINT', onShutdown);

    return {
        stop: async(): Promise<void> => {
            clearInterval(timer);
            process.removeListener('SIGTERM', onShutdown);
            process.removeListener('SIGINT', onShutdown);
            await byeHub(url, secret, instanceId);
        }
    };
};