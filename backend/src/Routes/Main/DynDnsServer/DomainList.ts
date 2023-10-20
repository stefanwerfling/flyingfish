import {DynDnsServerDomainServiceDB} from 'flyingfish_core';
import {DynDnsServerNotInDomain, DynDnsServerNotInDomainResponse, StatusCodes} from 'flyingfish_schemas';

/**
 * Domain list for DynDns Server.
 */
export class DomainList {

    /**
     * Return all Domains that not is used for DynDns Server.
     * @returns {DynDnsServerNotInDomainResponse}
     */
    public static async getDomains(): Promise<DynDnsServerNotInDomainResponse> {
        const domains = await DynDnsServerDomainServiceDB.getInstance().getDomainListByNotUsed();

        const list: DynDnsServerNotInDomain[] = [];

        for (const domain of domains) {
            list.push({
                id: domain.id,
                name: domain.domainname
            });
        }

        return {
            statusCode: StatusCodes.OK,
            list: list
        };
    }

}