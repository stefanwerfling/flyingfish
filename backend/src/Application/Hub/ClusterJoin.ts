import {Logger} from '@stefanwerfling/figtree';
import {ClusterJoinRequest, DefaultReturn, StatusCodes} from 'flyingfish_schemas';
import {FlyingFishConfig} from '../Config/FlyingFishConfig.js';

/**
 * How long the Hub waits on the clusterserver join (it runs the bootstrap pre-flight).
 */
const JOIN_TIMEOUT_MS = 15000;

/**
 * Proxy a join action from the Hub UI/API to the co-located clusterserver (Cluster/
 * Mesh epic 9.5.12.2, model (b)). The Hub owns the UI + RBAC; the clusterserver owns
 * the mesh, so applying a join package (seed-dial + bootstrap) happens there. Returns
 * a clear error when the clusterserver URL is not configured or the call fails.
 * @param request - the join package fields (target mesh endpoint, token, CA pin)
 */
export async function proxyClusterJoin(request: ClusterJoinRequest): Promise<DefaultReturn> {
    const url = FlyingFishConfig.getInstance().get()?.clusterserver?.url;

    if (url === undefined || url === '') {
        return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'clusterserver URL is not configured on this node'};
    }

    try {
        const response = await fetch(`${url.replace(/\/+$/u, '')}/cluster/join`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify(request),
            signal: AbortSignal.timeout(JOIN_TIMEOUT_MS)
        });

        if (!response.ok) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: `clusterserver returned HTTP ${response.status}`};
        }

        return await response.json() as DefaultReturn;
    } catch (error) {
        Logger.getLogger().warn(`ClusterJoin: proxy to clusterserver failed: ${error}`);

        return {statusCode: StatusCodes.INTERNAL_ERROR, msg: `${error}`};
    }
}
