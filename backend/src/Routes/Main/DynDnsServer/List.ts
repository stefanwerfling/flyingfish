import {DynDnsServerDomainServiceDB, DynDnsServerUserServiceDB} from 'flyingfish_core';
import {DynDnsServerData, DynDnsServerListResponse, StatusCodes} from 'flyingfish_schemas';

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
                const domainList: number[] = [];

                const domains = await DynDnsServerDomainServiceDB.getInstance().findByUser(user.id);

                for (const domain of domains) {
                    domainList.push(domain.domain_id);
                }

                list.push({
                    user: {
                        id: user.id,
                        username: user.username,
                        password: user.password,
                        last_update: user.last_update
                    },
                    domain_ids: domainList
                });
            }
        }

        return {
            statusCode: StatusCodes.OK,
            list: list
        };
    }

}