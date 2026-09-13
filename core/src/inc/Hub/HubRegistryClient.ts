import {Logger} from 'figtree';
import {CapabilityManifest, StatusCodes} from 'flyingfish_schemas';
import * as https from 'https';
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
 * A part's mTLS client identity (own-PKI epic 9.4): the leaf certificate + key
 * it presents to authenticate to the Hub by certificate instead of the shared
 * secret. When present it is used for the registry transport.
 */
export type PkiClientIdentity = {
    cert: string;
    key: string;
    ca?: string|string[];
};

/**
 * Options for {@link startHubRegistration}.
 */
export type HubRegistrationOptions = {
    heartbeatMs?: number;
    identity?: PkiClientIdentity;
};

/**
 * Handle for a running registration lifecycle: stop clears the heartbeat and
 * sends a graceful bye.
 */
export type HubRegistrationHandle = {
    stop: () => Promise<void>;
};

/**
 * POST to a registry endpoint over mTLS, presenting the client certificate.
 * Returns the response `statusCode`, or null on a transport error / non-2xx.
 * Never throws.
 */
const postRegistryMtls = (
    target: string,
    secret: string,
    identity: PkiClientIdentity,
    body: unknown
): Promise<string|null> => {
    return new Promise<string|null>((resolve): void => {
        const url = new URL(target);
        const payload = JSON.stringify(body);

        const request = https.request({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            cert: identity.cert,
            key: identity.key,
            ca: identity.ca,
            headers: {
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(payload),
                [REGISTRY_SECRET_HEADER]: secret
            }
        }, (response): void => {
            let data = '';

            response.setEncoding('utf-8');
            response.on('data', (chunk: string): void => {
                data += chunk;
            });
            response.on('end', (): void => {
                if (response.statusCode === undefined || response.statusCode < 200 || response.statusCode >= 300) {
                    resolve(null);
                    return;
                }

                try {
                    resolve((JSON.parse(data) as {statusCode?: string;}).statusCode ?? null);
                } catch {
                    resolve(null);
                }
            });
        });

        request.on('error', (error): void => {
            Logger.getLogger().warn('HubRegistryClient: mTLS transport error', error);
            resolve(null);
        });

        request.write(payload);
        request.end();
    });
};

/**
 * POST to a registry endpoint. Uses the mTLS transport when a client identity is
 * given (certificate auth), otherwise a plain fetch with the shared secret.
 * Returns the response `statusCode`, or null on a transport error / non-2xx.
 * Non-fatal: never throws.
 */
const postRegistry = async(
    url: string,
    secret: string,
    endpoint: 'register' | 'heartbeat' | 'bye',
    body: unknown,
    identity?: PkiClientIdentity
): Promise<string | null> => {
    const target = `${url.replace(/\/+$/u, '')}/json/registry/${endpoint}`;

    if (identity) {
        return postRegistryMtls(target, secret, identity, body);
    }

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
 * @param {PkiClientIdentity} [identity] - mTLS client identity (cert auth)
 * @returns {Promise<boolean>} true when the hub accepted the registration
 */
export const registerWithHub = async(
    url: string,
    secret: string,
    manifest: CapabilityManifest,
    identity?: PkiClientIdentity
): Promise<boolean> => {
    const ok = await postRegistry(url, secret, 'register', manifest, identity) === StatusCodes.OK;

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
export const heartbeatHub = async(
    url: string,
    secret: string,
    instanceId: string,
    identity?: PkiClientIdentity
): Promise<boolean> => {
    return await postRegistry(url, secret, 'heartbeat', {instanceId: instanceId}, identity) === StatusCodes.OK;
};

/**
 * Deregister a part (graceful shutdown).
 */
export const byeHub = async(
    url: string,
    secret: string,
    instanceId: string,
    identity?: PkiClientIdentity
): Promise<void> => {
    await postRegistry(url, secret, 'bye', {instanceId: instanceId}, identity);
};

/**
 * Run the full registration lifecycle for a part: register once, then heartbeat
 * on an interval, and send a graceful bye on SIGTERM/SIGINT. If a heartbeat
 * reports the part as unknown (e.g. the backend restarted and lost its in-memory
 * registry), it re-registers. The heartbeat timer is unref'd so it never keeps
 * an otherwise-idle process alive. Non-fatal throughout. When `options.identity`
 * is set the registry transport uses mTLS (certificate auth) instead of relying
 * on the shared secret alone.
 * @param {string} url - base URL of the backend hub
 * @param {string} secret - shared registry secret
 * @param {CapabilityManifest} manifest - this part's capability manifest
 * @param {HubRegistrationOptions} options - heartbeat interval + client identity
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
    const identity = options.identity;

    await registerWithHub(url, secret, manifest, identity);

    const beat = async(): Promise<void> => {
        const alive = await heartbeatHub(url, secret, instanceId, identity);

        if (!alive) {
            // Backend may have restarted and lost its in-memory registry.
            await registerWithHub(url, secret, manifest, identity);
        }
    };

    // postRegistry never rejects (it catches transport errors), so the beat
    // promise is safe to leave unawaited here.
    const timer = setInterval((): void => {
        beat();
    }, heartbeatMs);

    timer.unref();

    const onShutdown = (): void => {
        byeHub(url, secret, instanceId, identity);
    };

    process.once('SIGTERM', onShutdown);
    process.once('SIGINT', onShutdown);

    return {
        stop: async(): Promise<void> => {
            clearInterval(timer);
            process.removeListener('SIGTERM', onShutdown);
            process.removeListener('SIGINT', onShutdown);
            await byeHub(url, secret, instanceId, identity);
        }
    };
};