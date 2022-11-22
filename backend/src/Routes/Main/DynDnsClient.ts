import {Body, Get, JsonController, Post, Session} from 'routing-controllers-extended';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {DynDnsClient as DynDnsClientDB} from '../../inc/Db/MariaDb/Entity/DynDnsClient.js';
import {DynDnsClientDomain as DynDnsClientDomainDB} from '../../inc/Db/MariaDb/Entity/DynDnsClientDomain.js';
import {Domain as DomainDB} from '../../inc/Db/MariaDb/Entity/Domain.js';
import {DynDnsProvider, DynDnsProviders} from '../../inc/Provider/DynDnsProviders.js';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn.js';
import {StatusCodes} from '../../inc/Routes/StatusCodes.js';

/**
 * DynDnsClientDomain
 */
export type DynDnsClientDomain = {
    id: number;
    name: string;
};

/**
 * DynDnsClientProvider
 */
export type DynDnsClientProvider = {
    name: string;
    title: string;
};

/**
 * DynDnsClientData
 */
export type DynDnsClientData = {
    id: number;
    domains: DynDnsClientDomain[];
    provider: DynDnsClientProvider;
    username: string;
    password?: string;
    update_domain: boolean;
    last_status: number;
    last_status_msg: string;
    last_update: number;
};

/**
 * DynDnsClientListResponse
 */
export type DynDnsClientListResponse = DefaultReturn & {
    list: DynDnsClientData[];
};

/**
 * DynDnsClientProviderListResponse
 */
export type DynDnsClientProviderListResponse = DefaultReturn & {
    list: DynDnsProvider[];
};

/**
 * DynDnsClient
 */
@JsonController()
export class DynDnsClient {

    /**
     * getList
     */
    @Get('/json/dyndnsclient/list')
    public async getList(@Session() session: any): Promise<DynDnsClientListResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const dyndnsclientRepository = DBHelper.getRepository(DynDnsClientDB);
            const dyndnsclientDomainRepository = DBHelper.getRepository(DynDnsClientDomainDB);
            const domainRepository = DBHelper.getRepository(DomainDB);

            const list: DynDnsClientData[] = [];
            const clients = await dyndnsclientRepository.find();

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
                            const tdomain = await domainRepository.findOne({
                                where: {
                                    id: domain.domain_id
                                }
                            });

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

        return {
            statusCode: StatusCodes.UNAUTHORIZED,
            list: []
        };
    }

    /**
     * getProviders
     * @param session
     */
    @Get('/json/dyndnsclient/provider/list')
    public async getProviders(@Session() session: any): Promise<DynDnsClientProviderListResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            return {
                statusCode: StatusCodes.OK,
                list: DynDnsProviders.getProviders()
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED,
            list: []
        };
    }

    /**
     * saveClient
     * @param session
     * @param request
     */
    @Post('/json/dyndnsclient/save')
    public async saveClient(@Session() session: any, @Body() request: DynDnsClientData): Promise<DefaultReturn> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const dyndnsclientRepository = DBHelper.getRepository(DynDnsClientDB);
            const dyndnsclientDomainRepository = DBHelper.getRepository(DynDnsClientDomainDB);

            let client: DynDnsClientDB|null = null;

            if (request.id > 0) {
                const tclient = await dyndnsclientRepository.findOne({
                    where: {
                        id: request.id
                    }
                });

                if (tclient) {
                    client = tclient;
                }
            }

            if (client === null) {
                client = new DynDnsClientDB();
            }

            client.provider = request.provider.name;
            client.username = request.username;

            if (request.password) {
                client.password = request.password;
            }

            client.update_domain = request.update_domain;

            client = await DBHelper.getDataSource().manager.save(client);

            // domain links --------------------------------------------------------------------------------------------

            if (request.domains.length === 0) {
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
                    const checkDomainExistence = (domainId: number): boolean => request.domains.some(({id}) => id === domainId);

                    for await (const oldDomain of odomains) {
                        if (!checkDomainExistence(oldDomain.domain_id)) {
                            await dyndnsclientDomainRepository.delete({
                                id: oldDomain.id
                            });
                        }
                    }
                }

                // update or add ---------------------------------------------------------------------------------------

                for await (const domain of request.domains) {
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
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * deleteClient
     * @param session
     * @param request
     */
    @Post('/json/dyndnsclient/delete')
    public async deleteClient(
        @Session() session: any,
        @Body() request: DynDnsClientData
    ): Promise<DefaultReturn> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const dyndnsclientRepository = DBHelper.getRepository(DynDnsClientDB);
            const dyndnsclientDomainRepository = DBHelper.getRepository(DynDnsClientDomainDB);

            const tclient = await dyndnsclientRepository.findOne({
                where: {
                    id: request.id
                }
            });

            if (tclient) {
                await dyndnsclientDomainRepository.delete({
                    dyndnsclient_id: tclient.id
                });

                const result = await dyndnsclientRepository.delete({
                    id: tclient.id
                });

                if (result) {
                    return {
                        statusCode: StatusCodes.OK
                    };
                }

                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Client can not delete!'
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Client not found!'
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}