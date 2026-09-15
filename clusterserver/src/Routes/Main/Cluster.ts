import {Request, Response} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {ClusterStatusResponse, StatusCodes} from 'flyingfish_schemas';

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
     * @param status - this node's cluster identity
     */
    public constructor(status: ClusterNodeStatus) {
        super();

        this._status = status;

        this._get('/health', (req, res): void => {
            res.status(200).json({statusCode: StatusCodes.OK});
        });

        this._get('/cluster/status', (req, res): void => {
            this._clusterStatus(req, res);
        });
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