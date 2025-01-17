import {DomainServiceDB, DynDnsClientServiceDB, DynDnsClientDomainServiceDB} from 'flyingfish_core';
import {
    DynDnsClientData,
    DynDnsClientDomain,
    DynDnsClientListResponse,
    StatusCodes
} from 'flyingfish_schemas';
import {DynDnsProviders} from '../../../inc/Provider/DynDnsProviders.js';

/**
 * List Route for DynDnsClient.
 */
export class List {

    /**
     * Return a list to UI with clients' information.
     * @returns {DynDnsClientListResponse}
     */
    public static async getList(): Promise<DynDnsClientListResponse> {
        const list: DynDnsClientData[] = [];
        const clients = await DynDnsClientServiceDB.getInstance().findAll();

        if (clients) {
            for await (const client of clients) {
                const provider = DynDnsProviders.getProvider(client.provider);
                let providerName = '';
                let providerTitle = '';
                let statusMsg = '';

                if (provider) {
                    providerName = provider.getName();
                    providerTitle = provider.getTitle();
                    statusMsg = provider.getStatusMsg(`${client.last_status}`);
                }

                const domains: DynDnsClientDomain[] = [];

                const domainList = await DynDnsClientDomainServiceDB.getInstance().findAllByClientId(client.id);

                if (domainList) {
                    for await (const domain of domainList) {
                        const tdomain = await DomainServiceDB.getInstance().findOne(domain.domain_id);

                        if (tdomain) {
                            domains.push({
                                id: domain.domain_id,
                                name: tdomain.domainname
                            });
                        }
                    }
                }

                list.push({
                    id: client.id,
                    domains: domains,
                    main_domain: client.main_domain_id,
                    provider: {
                        name: providerName,
                        title: providerTitle
                    },
                    update_domain: client.update_domain,
                    username: client.username,
                    last_status: client.last_status,
                    last_status_msg: statusMsg,
                    last_update: client.last_update
                });
            }
        }

        return {
            statusCode: StatusCodes.OK,
            list: list
        };
    }

}