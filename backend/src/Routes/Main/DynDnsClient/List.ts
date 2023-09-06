import {DBHelper, DomainServiceDB, DynDnsClientServiceDB} from 'flyingfish_core';
import {
    DynDnsClientData,
    DynDnsClientDomain,
    DynDnsClientListResponse,
    StatusCodes
} from 'flyingfish_schemas';
import {DynDnsClientDomain as DynDnsClientDomainDB} from '../../../inc/Db/MariaDb/Entity/DynDnsClientDomain.js';
import {DynDnsProviders} from '../../../inc/Provider/DynDnsProviders.js';

/**
 * List
 */
export class List {

    /**
     * getList
     */
    public static async getList(): Promise<DynDnsClientListResponse> {
        const dyndnsclientDomainRepository = DBHelper.getRepository(DynDnsClientDomainDB);

        const list: DynDnsClientData[] = [];
        const clients = await DynDnsClientServiceDB.getInstance().findAll();

        if (clients) {
            for await (const client of clients) {
                const provider = DynDnsProviders.getProvider(client.provider);
                let providerName = '';
                let providerTitle = '';

                if (provider) {
                    providerName = provider.getName();
                    providerTitle = provider.getTitle();
                }

                const domains: DynDnsClientDomain[] = [];

                const domainList = await dyndnsclientDomainRepository.find({
                    where: {
                        dyndnsclient_id: client.id
                    }
                });

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
                    provider: {
                        name: providerName,
                        title: providerTitle
                    },
                    update_domain: client.update_domain,
                    username: client.username,
                    last_status: client.last_status,
                    last_status_msg: provider?.getStatusMsg(client.last_status)!,
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