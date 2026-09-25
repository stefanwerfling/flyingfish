import {Logger} from '@stefanwerfling/figtree';
import {ClusterControlReplyBody} from 'flyingfish_schemas';
import {FlyingFishConfig} from '../Config/FlyingFishConfig.js';

/**
 * How long the Hub waits on the co-located clusterserver for a cross-node control
 * request (it dials the peer, sends, and waits for the peer's own reply — see {@link
 * CLUSTER_CONTROL_TIMEOUT_MS} in core, whose default is 10s; this must be longer).
 */
const CONTROL_PROXY_TIMEOUT_MS = 15000;

/**
 * Proxy a synchronous cross-node control request from the Hub to the co-located
 * clusterserver (Cluster/Mesh epic 9.5.12.4/.6, the A+C write/read path): the Hub owns
 * authorization (call {@link canAccessRemoteResource} BEFORE this — this function does
 * not check anything itself) and the UI/API; the clusterserver owns the mesh, so the
 * actual dial + request/reply happens there via `ClusterControl`. Mirrors {@link
 * proxyClusterJoin}. Always resolves (never throws) — `ok: false` + `error` covers a
 * missing/unreachable clusterserver, mesh inactive, no such peer, a timeout, and an
 * application-level error the remote handler returned; the caller tells those apart
 * only by the message, not by a distinct code (same as {@link ClusterControl.request}).
 * @param nodeUid - the target node's mesh uid
 * @param method - the control method to invoke (e.g. `domain.list`)
 * @param payload - the method's request payload
 */
export async function proxyClusterControlRequest(nodeUid: string, method: string, payload: unknown): Promise<ClusterControlReplyBody> {
    const url = FlyingFishConfig.getInstance().get()?.clusterserver?.url;

    if (url === undefined || url === '') {
        return {ok: false, error: 'clusterserver URL is not configured on this node'};
    }

    try {
        const response = await fetch(`${url.replace(/\/+$/u, '')}/cluster/control`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({nodeUid, method, payload}),
            signal: AbortSignal.timeout(CONTROL_PROXY_TIMEOUT_MS)
        });

        if (!response.ok) {
            return {ok: false, error: `clusterserver returned HTTP ${response.status}`};
        }

        return await response.json() as ClusterControlReplyBody;
    } catch (error) {
        Logger.getLogger().warn(`ClusterControlProxy: request to clusterserver failed: ${error}`);

        return {ok: false, error: `${error}`};
    }
}
