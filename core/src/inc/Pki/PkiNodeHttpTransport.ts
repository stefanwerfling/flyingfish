import {PkiEnrollResponse} from 'flyingfish_schemas';
import {
    PkiNodeEnrollRequest,
    PkiNodeEnrollResult,
    PkiNodeRenewRequest,
    PkiNodeTransport
} from './PkiNodeClient.js';

/**
 * HTTP implementation of the node PKI transport (own-PKI epic 9.4, 9.4.3-D):
 * POSTs the enroll/renew requests to the pkiserver's EST endpoints and unwraps
 * the issued certificate from the response. Used in production; tests inject a
 * transport backed by an in-process service instead.
 */
export class PkiNodeHttpTransport implements PkiNodeTransport {

    private readonly _baseUrl: string;

    /**
     * @param baseUrl - the pkiserver base URL (trailing slashes are trimmed)
     */
    public constructor(baseUrl: string) {
        this._baseUrl = baseUrl.replace(/\/+$/u, '');
    }

    /**
     * POST /pki/enroll.
     * @param request - the enrollment body
     */
    public async enroll(request: PkiNodeEnrollRequest): Promise<PkiNodeEnrollResult> {
        return this._post('/pki/enroll', request);
    }

    /**
     * POST /pki/renew.
     * @param request - the re-enrollment body
     */
    public async renew(request: PkiNodeRenewRequest): Promise<PkiNodeEnrollResult> {
        return this._post('/pki/renew', request);
    }

    /**
     * POST a request and unwrap the issued certificate, throwing if the server
     * did not issue one (e.g. a pending request or an error response).
     * @param endpoint - the endpoint path
     * @param body - the request body
     */
    private async _post(endpoint: string, body: unknown): Promise<PkiNodeEnrollResult> {
        const response = await fetch(`${this._baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify(body)
        });

        const data = await response.json() as PkiEnrollResponse;

        if (!data.issued) {
            throw new Error(`PkiNodeHttpTransport: ${endpoint} did not issue a certificate: ${data.msg ?? 'no issued payload'}`);
        }

        return {
            nodeUid: data.issued.nodeUid,
            certificate: data.issued.certificate,
            chain: data.issued.chain
        };
    }

}