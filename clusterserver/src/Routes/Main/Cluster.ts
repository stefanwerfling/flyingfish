import {Request, Response} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {
    ClusterControlReplyBody,
    ClusterJoinRequest,
    ClusterStatusResponse,
    SchemaClusterControlRequest,
    SchemaClusterJoinRequest,
    StatusCodes
} from 'flyingfish_schemas';

/**
 * This cluster node's identity, as reported by /cluster/status.
 */
export type ClusterNodeStatus = {
    nodeUid: string;
    purpose: string;
    commonName: string;
    enrolled: boolean;
};

/**
 * A mutable holder for the join action (Cluster/Mesh epic 9.5.12.2). The HTTP route
 * is created at boot before the mesh comes up; the mesh block fills in `handler`
 * once membership + trust are ready, so `POST /cluster/join` can seed-dial + bootstrap
 * into the target cluster. `handler` stays undefined when the mesh is not active.
 */
export type ClusterJoinController = {
    handler?: (request: ClusterJoinRequest) => Promise<void>;
};

/**
 * A mutable holder for the outbound control-request action (Cluster/Mesh epic
 * 9.5.12.4/.6, the A+C synchronous cross-node path). Wired the same way as {@link
 * ClusterJoinController}: the HTTP route exists before the mesh does, the mesh block
 * fills in `handler` once `ClusterControl` is up, so the local Hub can ask this
 * clusterserver to dial a mesh peer and relay a request/reply — resource-type-agnostic,
 * the control layer never interprets `method`/`payload`. `handler` stays undefined
 * (mesh inactive) or rejects (unknown/unreachable peer, timeout) exactly as {@link
 * ClusterControl.request} does; the route maps either into an `ok: false` reply.
 */
export type ClusterControlProxyController = {
    handler?: (nodeUid: string, method: string, payload: unknown) => Promise<ClusterControlReplyBody>;
};

/**
 * Cluster — the HTTP endpoints of the cluster control part (Cluster/Mesh epic
 * 9.5): a `/health` probe and a read-only `/cluster/status` reporting this node's
 * stable PKI cluster identity. Peer/mesh management endpoints come in later slices
 * (the Proxmox-style cluster management is 9.5.12).
 */
export class Cluster extends DefaultRoute {

    /**
     * this node's cluster identity (populated by enrollment at boot).
     */
    private readonly _status: ClusterNodeStatus;

    /**
     * the join action holder (filled once the mesh is up); undefined = no mesh.
     */
    private readonly _joinController?: ClusterJoinController;

    /**
     * the outbound control-request holder (filled once the mesh is up); undefined = no mesh.
     */
    private readonly _controlController?: ClusterControlProxyController;

    /**
     * @param status - this node's cluster identity
     * @param joinController - the mutable join-action holder (mesh fills it in)
     * @param controlController - the mutable control-request holder (mesh fills it in)
     */
    public constructor(status: ClusterNodeStatus, joinController?: ClusterJoinController, controlController?: ClusterControlProxyController) {
        super();

        this._status = status;
        this._joinController = joinController;
        this._controlController = controlController;

        this._get('/health', (req, res): void => {
            res.status(200).json({statusCode: StatusCodes.OK});
        });

        this._get('/cluster/status', (req, res): void => {
            this._clusterStatus(req, res);
        });

        this._post('/cluster/join', async(req, res): Promise<void> => {
            await this._join(req, res);
        });

        this._post('/cluster/control', async(req, res): Promise<void> => {
            await this._control(req, res);
        });
    }

    /**
     * POST /cluster/join — apply a join package on this node (model (b) one-port
     * join): seed-dial the target's mesh endpoint and run the bootstrap CA/token
     * exchange so this node and the target come to trust each other and mesh. Fails
     * when the mesh is not active on this node.
     * @param req - the request
     * @param res - the response
     */
    private async _join(req: Request, res: Response): Promise<void> {
        const handler = this._joinController?.handler;

        if (handler === undefined) {
            res.status(200).json({statusCode: StatusCodes.INTERNAL_ERROR, msg: 'cluster mesh is not active on this node'});

            return;
        }

        if (!this.isSchemaValidate(SchemaClusterJoinRequest, req.body, res)) {
            return;
        }

        try {
            await handler({
                meshHost: req.body.meshHost,
                meshPort: req.body.meshPort,
                bootstrapToken: req.body.bootstrapToken,
                caFingerprint: req.body.caFingerprint
            });

            res.status(200).json({statusCode: StatusCodes.OK});
        } catch (error) {
            res.status(200).json({statusCode: StatusCodes.INTERNAL_ERROR, msg: `${error}`});
        }
    }

    /**
     * POST /cluster/control — dial a mesh peer with a synchronous control request and
     * relay its reply (Cluster/Mesh epic 9.5.12.4/.6, the A+C write/read path). The
     * local Hub has ALREADY authorized this call (node-group share + RBAC grant, see
     * {@link canAccessRemoteResource}) before ever reaching here — this proxy trusts its
     * own Hub and just dials. `ok: false` covers "mesh not active on this node", "no
     * such peer" / a peer that never answers (timeout), and an application-level error
     * the remote handler returned — the caller (the local Hub) tells those apart by
     * `error`, not by HTTP status (this endpoint always answers 200).
     * @param req - the request
     * @param res - the response
     */
    private async _control(req: Request, res: Response): Promise<void> {
        const handler = this._controlController?.handler;

        if (handler === undefined) {
            res.status(200).json({ok: false, error: 'cluster mesh is not active on this node'});

            return;
        }

        if (!this.isSchemaValidate(SchemaClusterControlRequest, req.body, res)) {
            return;
        }

        try {
            const reply = await handler(req.body.nodeUid, req.body.method, req.body.payload);

            res.status(200).json(reply);
        } catch (error) {
            res.status(200).json({ok: false, error: `${error}`});
        }
    }

    /**
     * GET /cluster/status — this node's stable cluster identity + enrollment state.
     * @param req - the request
     * @param res - the response
     */
    private _clusterStatus(req: Request, res: Response): void {
        const response: ClusterStatusResponse = {
            statusCode: StatusCodes.OK,
            nodeUid: this._status.nodeUid,
            purpose: this._status.purpose,
            commonName: this._status.commonName,
            enrolled: this._status.enrolled
        };

        res.status(200).json(response);
    }

}