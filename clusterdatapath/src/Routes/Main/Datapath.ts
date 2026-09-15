import {Request, Response} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {StatusCodes} from 'flyingfish_schemas';

/**
 * This data-plane node's live status, as reported by /datapath/status.
 */
export type DatapathNodeStatus = {
    nodeUid: string;
    overlayIp: string;
    transport: string;
    enrolled: boolean;
    tunActive: boolean;
    tunIfName: string;
    peers(): string[];
};

/**
 * Datapath — the HTTP endpoints of the cluster data-plane node (Cluster/Mesh epic
 * 9.5.1): a `/health` probe and a read-only `/datapath/status` reporting this
 * node's cluster identity, overlay IP, transport, TUN state and connected peers.
 */
export class Datapath extends DefaultRoute {

    /**
     * this node's live data-plane status.
     */
    private readonly _status: DatapathNodeStatus;

    /**
     * @param status - this node's data-plane status
     */
    public constructor(status: DatapathNodeStatus) {
        super();

        this._status = status;

        this._get('/health', (req, res): void => {
            res.status(200).json({statusCode: StatusCodes.OK});
        });

        this._get('/datapath/status', (req, res): void => {
            this._datapathStatus(req, res);
        });
    }

    /**
     * GET /datapath/status — identity, overlay IP, transport, TUN state and peers.
     * @param req - the request
     * @param res - the response
     */
    private _datapathStatus(req: Request, res: Response): void {
        res.status(200).json({
            statusCode: StatusCodes.OK,
            nodeUid: this._status.nodeUid,
            overlayIp: this._status.overlayIp,
            transport: this._status.transport,
            enrolled: this._status.enrolled,
            tunActive: this._status.tunActive,
            tunIfName: this._status.tunIfName,
            peers: this._status.peers()
        });
    }

}