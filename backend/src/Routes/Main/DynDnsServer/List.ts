import {DomainServiceDB, DynDnsServerDomainServiceDB, DynDnsServerUserServiceDB} from 'flyingfish_core';
import {DynDnsServerData, DynDnsServerDomain, DynDnsServerListResponse, StatusCodes} from 'flyingfish_schemas';

/**
 * List
 */
export class List {

    /**
     * getList
     */
    public static async getList(): Promise<DynDnsServerListResponse> {
        const users = await DynDnsServerUserServiceDB.getInstance().findAll();

        const list: DynDnsServerData[] = [];

        if (users) {
            for await (const user of users) {
                const domainList: DynDnsServerDomain[] = [];

                const domains = await DynDnsServerDomainServiceDB.getInstance().findByUser(user.id);

                for await (const dynDomain of domains) {
                    const domain = await DomainServiceDB.getInstance().findOne(dynDomain.domain_id);

                    if (domain) {
                        domainList.push({
                            id: dynDomain.domain_id,
                            name: domain.domainname
                        });
                    }
                }

                list.push({
                    user: {
                        id: user.id,
                        username: user.username,
                        password: user.password,
                        last_update: user.last_update
                    },
                    domains: domainList,
                    last_update: user.last_update
                });
            }
        }

        return {
            statusCode: StatusCodes.OK,
            list: list
        };
    }

}