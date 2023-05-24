import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {DBHelper} from '../../../inc/Db/MariaDb/DBHelper.js';
import {DynDnsClient as DynDnsClientDB} from '../../../inc/Db/MariaDb/Entity/DynDnsClient.js';
import {DynDnsClientDomain as DynDnsClientDomainDB} from '../../../inc/Db/MariaDb/Entity/DynDnsClientDomain.js';
import {DynDnsClientData} from './List.js';

/**
 * Save
 */
export class Save {

    /**
     * saveClient
     * @param data
     */
    public static async saveClient(data: DynDnsClientData): Promise<DefaultReturn> {
        const dyndnsclientRepository = DBHelper.getRepository(DynDnsClientDB);
        const dyndnsclientDomainRepository = DBHelper.getRepository(DynDnsClientDomainDB);

        let client: DynDnsClientDB|null = null;

        if (data.id > 0) {
            const tclient = await dyndnsclientRepository.findOne({
                where: {
                    id: data.id
                }
            });

            if (tclient) {
                client = tclient;
            }
        }

        if (client === null) {
            client = new DynDnsClientDB();
        }

        client.provider = data.provider.name;
        client.username = data.username;

        if (data.password) {
            client.password = data.password;
        }

        client.update_domain = data.update_domain;

        client = await DBHelper.getDataSource().manager.save(client);

        if (client) {
            // domain links --------------------------------------------------------------------------------------------

            if (data.domains.length === 0) {
                await dyndnsclientDomainRepository.delete({
                    dyndnsclient_id: client.id
                });
            } else {
                const odomains = await dyndnsclientDomainRepository.find({
                    where: {
                        dyndnsclient_id: client.id
                    }
                });

                if (odomains) {
                    const checkDomainExistence = (domainId: number): boolean => data.domains.some(({id}) => id === domainId);

                    for await (const oldDomain of odomains) {
                        if (!checkDomainExistence(oldDomain.domain_id)) {
                            await dyndnsclientDomainRepository.delete({
                                id: oldDomain.id
                            });
                        }
                    }
                }

                // update or add ---------------------------------------------------------------------------------------

                for await (const domain of data.domains) {
                    let newDomain: DynDnsClientDomainDB|null = null;

                    const tdomain = await dyndnsclientDomainRepository.findOne({
                        where: {
                            domain_id: domain.id,
                            dyndnsclient_id: client.id
                        }
                    });

                    if (tdomain) {
                        newDomain = tdomain;
                    }

                    if (newDomain === null) {
                        newDomain = new DynDnsClientDomainDB();
                    }

                    newDomain.dyndnsclient_id = client.id;
                    newDomain.domain_id = domain.id;

                    await DBHelper.getDataSource().manager.save(newDomain);
                }
            }

            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: 'Client data can not save.'
        };
    }

}