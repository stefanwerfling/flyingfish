import {Request, Response} from 'express';
import {Logger} from 'figtree';
import {
    DefaultRoute,
    PkiCaPurpose,
    PkiEnrollmentInput,
    PkiEnrollmentRequest,
    PkiEnrollmentService,
    PkiRenewalInput,
    PkiSanEntry
} from 'flyingfish_core';
import {
    PkiCaCertsResponse,
    PkiEnrollResponse,
    SchemaPkiEnrollDecision,
    SchemaPkiEnrollRequest,
    SchemaPkiRenewRequest,
    StatusCodes
} from 'flyingfish_schemas';
import {PkiStore} from '../../inc/Pki/PkiStore.js';

/**
 * Pki — the EST-style enrollment HTTP endpoints of the PKI part container
 * (own-PKI epic 9.4): `/pki/cacerts` (the CA chain for a purpose), `/pki/enroll`
 * (CSR + bootstrap token), the admin `/pki/enroll/approve|reject` decisions and a
 * `/health` probe. Handlers are wired over the in-memory PkiEnrollmentService
 * (crypto + state) and mirror durable state into the database via PkiStore.
 */
export class Pki extends DefaultRoute {

    /**
     * the enrollment service (issues from the CA tree, tracks the pending queue).
     */
    private readonly _service: PkiEnrollmentService;

    /**
     * durable state mirror (CA tree + issued/enrollment rows).
     */
    private readonly _store: PkiStore;

    /**
     * @param service - the enrollment service
     * @param store - the durable store
     */
    public constructor(service: PkiEnrollmentService, store: PkiStore) {
        super();

        this._service = service;
        this._store = store;

        this._get('/health', (req, res): void => {
            res.status(200).json({statusCode: StatusCodes.OK});
        });

        this._get('/pki/cacerts', (req, res): void => {
            this._cacerts(req, res);
        });

        this._post('/pki/enroll', async(req, res): Promise<void> => {
            await this._enroll(req, res);
        });

        this._post('/pki/renew', async(req, res): Promise<void> => {
            await this._renew(req, res);
        });

        this._post('/pki/enroll/approve', async(req, res): Promise<void> => {
            await this._approve(req, res);
        });

        this._post('/pki/enroll/reject', async(req, res): Promise<void> => {
            await this._reject(req, res);
        });
    }

    /**
     * GET /pki/cacerts?purpose=service — the EST cacerts chain for a purpose
     * ([intermediate, root]). Defaults to the `service` purpose (internal
     * Hub<->parts mTLS), the common enrollment case.
     * @param req - the request
     * @param res - the response
     */
    private _cacerts(req: Request, res: Response): void {
        const purpose = this._parsePurpose(req.query.purpose);

        const response: PkiCaCertsResponse = {
            statusCode: StatusCodes.OK,
            chain: this._service.getCaChain(purpose)
        };

        res.status(200).json(response);
    }

    /**
     * POST /pki/enroll — consume a CSR + bootstrap token, issue immediately on an
     * auto-approve token or queue the request otherwise, and persist the state.
     * @param req - the request
     * @param res - the response
     */
    private async _enroll(req: Request, res: Response): Promise<void> {
        if (!this.isSchemaValidate(SchemaPkiEnrollRequest, req.body, res)) {
            return;
        }

        const input: PkiEnrollmentInput = {
            csr: req.body.csr,
            bootstrapToken: req.body.bootstrapToken,
            commonName: req.body.commonName,
            sans: req.body.sans as unknown as PkiSanEntry[] | undefined,
            validityDays: req.body.validityDays
        };

        try {
            const request = await this._service.enroll(input);
            await this._store.persistEnrollment(request);

            res.status(200).json(Pki._toResponse(request));
        } catch (error) {
            Logger.getLogger().warn('Pki::_enroll: enrollment rejected: %s', `${error}`);

            res.status(200).json({
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: `${error}`
            });
        }
    }

    /**
     * POST /pki/renew — EST simple-reenroll: issue a fresh leaf for an existing
     * node from a new CSR (key rotation), keeping the stable nodeUid, and persist
     * the new issued certificate. Re-enrollment is authenticated by the node's
     * current certificate at the transport (mTLS), so no bootstrap token.
     * @param req - the request
     * @param res - the response
     */
    private async _renew(req: Request, res: Response): Promise<void> {
        if (!this.isSchemaValidate(SchemaPkiRenewRequest, req.body, res)) {
            return;
        }

        const input: PkiRenewalInput = {
            nodeUid: req.body.nodeUid,
            purpose: req.body.purpose as unknown as PkiCaPurpose,
            csr: req.body.csr,
            commonName: req.body.commonName,
            sans: req.body.sans as unknown as PkiSanEntry[] | undefined,
            validityDays: req.body.validityDays
        };

        try {
            const request = await this._service.renew(input);
            await this._store.persistEnrollment(request);

            res.status(200).json(Pki._toResponse(request));
        } catch (error) {
            Logger.getLogger().warn('Pki::_renew: renewal rejected: %s', `${error}`);

            res.status(200).json({
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: `${error}`
            });
        }
    }

    /**
     * POST /pki/enroll/approve — approve a pending request and issue its cert.
     * @param req - the request
     * @param res - the response
     */
    private async _approve(req: Request, res: Response): Promise<void> {
        if (!this.isSchemaValidate(SchemaPkiEnrollDecision, req.body, res)) {
            return;
        }

        try {
            const request = await this._service.approve(req.body.requestId);
            await this._store.updateEnrollment(request);

            res.status(200).json(Pki._toResponse(request));
        } catch (error) {
            Logger.getLogger().warn('Pki::_approve: approve failed: %s', `${error}`);

            res.status(200).json({
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: `${error}`
            });
        }
    }

    /**
     * POST /pki/enroll/reject — reject a pending request.
     * @param req - the request
     * @param res - the response
     */
    private async _reject(req: Request, res: Response): Promise<void> {
        if (!this.isSchemaValidate(SchemaPkiEnrollDecision, req.body, res)) {
            return;
        }

        try {
            const request = this._service.reject(req.body.requestId);
            await this._store.updateEnrollment(request);

            res.status(200).json({statusCode: StatusCodes.OK});
        } catch (error) {
            Logger.getLogger().warn('Pki::_reject: reject failed: %s', `${error}`);

            res.status(200).json({
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: `${error}`
            });
        }
    }

    /**
     * Map a tracked enrollment request to the wire response.
     * @param request - the enrollment request
     */
    private static _toResponse(request: PkiEnrollmentRequest): PkiEnrollResponse {
        return {
            statusCode: StatusCodes.OK,
            id: request.id,
            // core PkiEnrollmentStatus and the wire PkiEnrollmentStatusVts share
            // identical string values but are nominally distinct enums.
            status: request.status as unknown as PkiEnrollResponse['status'],
            nodeUid: request.nodeUid,
            commonName: request.commonName,
            issued: request.issued
        };
    }

    /**
     * Parse and validate a `purpose` query value, defaulting to `service`.
     * @param value - the raw query value
     */
    private _parsePurpose(value: unknown): PkiCaPurpose {
        if (typeof value === 'string' && (Object.values(PkiCaPurpose) as string[]).includes(value)) {
            return value as PkiCaPurpose;
        }

        return PkiCaPurpose.service;
    }

}