import {DynDnsClientDB, DynDnsClientDomainDB, DynDnsClientDomainServiceDB, DynDnsClientServiceDB} from 'flyingfish_core';
import {DefaultReturn, DynDnsClientData, StatusCodes} from 'flyingfish_schemas';

/**
 * Save Route for DynDnsClient.
 */
export class Save {

    /**
     * Save client information from the UI.
     * @param {DynDnsClientData} data - Information to a client.
     * @returns {DefaultReturn} Default return data for UI.
     */
    public static async saveClient(data: DynDnsClientData): Promise<DefaultReturn> {
        let client: DynDnsClientDB|null = null;

        if (data.id > 0) {
            const tclient = await DynDnsClientServiceDB.getInstance().findOne(data.id);

            if (tclient) {
                client = tclient;
            }
        }

        if (client === null) {
            client = new DynDnsClientDB();
        }

        client.provider = data.provider.name;
        client.username = data.username;
        client.gateway_identifier_id = data.gateway_identifier_id;

        if (data.password) {
            client.password = data.password;
        }

        client.update_domain = data.update_domain;

        if (data.main_domain !== null) {
            client.main_domain_id = data.main_domain.id;
        }

        client = await DynDnsClientServiceDB.getInstance().save(client);

        if (client) {
            // domain links --------------------------------------------------------------------------------------------

            if (data.domains.length === 0) {
                await DynDnsClientDomainServiceDB.getInstance().removeByClientId(client.id);
            } else {
                const odomains = await DynDnsClientDomainServiceDB.getInstance().findAllByClientId(client.id);

                if (odomains) {
                    const checkDomainExistence = (domainId: number): boolean => data.domains.some(({id}) => id === domainId);

                    for await (const oldDomain of odomains) {
                        if (!checkDomainExistence(oldDomain.domain_id)) {
                            await DynDnsClientDomainServiceDB.getInstance().remove(oldDomain.id);
                        }
                    }
                }

                // update or add ---------------------------------------------------------------------------------------

                for await (const domain of data.domains) {
                    let newDomain: DynDnsClientDomainDB|null = null;

                    const tdomain = await DynDnsClientDomainServiceDB.getInstance().findByDomainId(domain.id, client.id);

                    if (tdomain) {
                        newDomain = tdomain;
                    }

                    if (newDomain === null) {
                        newDomain = new DynDnsClientDomainDB();
                    }

                    newDomain.dyndnsclient_id = client.id;
                    newDomain.domain_id = domain.id;

                    await DynDnsClientDomainServiceDB.getInstance().save(newDomain);
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