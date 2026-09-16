import {ClusterControlHandler, ClusterControlReply} from './ClusterControl.js';

/**
 * Handles one control method (Cluster/Mesh epic 9.5.12, A+C): applies the operation's
 * `payload` on behalf of the requesting `fromNodeUid` and returns the outcome. The
 * peer is already an authenticated mesh member (node B trusts the mesh), and node A
 * has already enforced the permission, so the handler applies the authorized write.
 * @param payload - the operation payload (arbitrary JSON)
 * @param fromNodeUid - the requesting peer's cluster nodeUid
 */
export type ClusterControlMethodHandler = (payload: unknown, fromNodeUid: string) => Promise<ClusterControlReply>;

/**
 * Routes an inbound cluster-control request to the handler registered for its method
 * (Cluster/Mesh epic 9.5.12, A+C): the {@link ClusterControl} engine forwards every
 * request here, and each cross-node write operation (e.g. a domain or RBAC-policy
 * write) registers itself by method name. An unknown method returns an error reply
 * rather than throwing, so an unrecognised or out-of-date peer request is answered
 * cleanly. {@link ClusterControlRequestRouter.handle} is shaped as a
 * {@link ClusterControlHandler} so it can be passed straight to `ClusterControl.onRequest`.
 */
export class ClusterControlRequestRouter {

    private readonly _methods: Map<string, ClusterControlMethodHandler> = new Map();

    /**
     * Register the handler for a method. Replaces any previous handler for that method.
     * @param method - the operation name
     * @param handler - the handler
     */
    public register(method: string, handler: ClusterControlMethodHandler): void {
        this._methods.set(method, handler);
    }

    /**
     * Dispatch a request to its method handler, or return an error reply for an unknown
     * method. Matches the {@link ClusterControlHandler} shape.
     * @param method - the operation name
     * @param payload - the operation payload
     * @param fromNodeUid - the requesting peer
     */
    public handle: ClusterControlHandler = async(method: string, payload: unknown, fromNodeUid: string): Promise<ClusterControlReply> => {
        const handler = this._methods.get(method);

        if (handler === undefined) {
            return {ok: false, error: `ClusterControl: unknown method '${method}'`};
        }

        return handler(payload, fromNodeUid);
    };

}