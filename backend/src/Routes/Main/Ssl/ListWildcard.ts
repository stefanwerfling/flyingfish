import {DomainServiceDB, NginxHttpServiceDB} from 'flyingfish_core';
import {SslListWildcardEntry, SslListWildcardRequest, SslListWildcardResponse, StatusCodes} from 'flyingfish_schemas';

/**
 * List Wildcard
 */
export class ListWildcard {

    /**
     * Get all Cert for Wildcard
     * @param {SslListWildcardRequest} req
     * @return {SslListWildcardResponse}
     */
    public static async getAllCertforWildcard(req: SslListWildcardRequest): Promise<SslListWildcardResponse> {
        const currentDomain = await DomainServiceDB.getInstance().findOne(req.domain_id);

        if (currentDomain === null) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Domain not found by ID!'
            };
        }

        const domains = await DomainServiceDB.getInstance().findAllParents(currentDomain.domainname);
        const domainMap: Map<number, string> = new Map<number, string>();

        for (const domain of domains) {
            domainMap.set(domain.id, domain.domainname);
        }

        const https = await NginxHttpServiceDB.getInstance().findAllCertWildcard([...domainMap.keys()]);
        const list: SslListWildcardEntry[] = [];

        for (const http of https) {
            list.push({
                owern_http_id: http.id,
                label: `*.${domainMap.get(http.domain_id)}`
            })
        }

        return {
            statusCode: StatusCodes.OK,
            list: list
        }
    }

}