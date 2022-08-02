import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
import {DynDnsClient as DynDnsClientDB} from '../../inc/Db/MariaDb/Entity/DynDnsClient';
import {DynDnsClientDomain as DynDnsClientDomainDB} from '../../inc/Db/MariaDb/Entity/DynDnsClientDomain';
import {Domain as DomainDB} from '../../inc/Db/MariaDb/Entity/Domain';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DynDnsProvider, DynDnsProviders} from '../../inc/Provider/DynDnsProviders';

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
export type DynDnsClientListResponse = {
    status: string;
    msg?: string;
    list: DynDnsClientData[];
};

/**
 * DynDnsClientProviderListResponse
 */
export type DynDnsClientProviderListResponse = {
    status: string;
    msg?: string;
    list: DynDnsProvider[];
};

/**
 * DynDnsClientSaveResponse
 */
export type DynDnsClientSaveResponse = {
    status: string;
    msg?: string;
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
            const dyndnsclientRepository = MariaDbHelper.getRepository(DynDnsClientDB);
            const dyndnsclientDomainRepository = MariaDbHelper.getRepository(DynDnsClientDomainDB);
            const domainRepository = MariaDbHelper.getRepository(DomainDB);

            const list: DynDnsClientData[] = [];
            const clients = await dyndnsclientRepository.find();

            if (clients) {
                for (const client of clients) {
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
                        for (const domain of domainList) {
                            const tdomain = await domainRepository.findOne({
                                id: domain.domain_id
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
                        domains,
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
                status: 'ok',
                list
            };
        }

        return {
            status: 'error',
            msg: 'Please login!',
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
                status: 'ok',
                list: DynDnsProviders.getProviders()
            };
        }

        return {
            status: 'error',
            msg: 'Please login!',
            list: []
        };
    }

    /**
     * saveClient
     * @param session
     * @param request
     */
    @Post('/json/dyndnsclient/save')
    public async saveClient(@Session() session: any, @Body() request: DynDnsClientData): Promise<DynDnsClientSaveResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const dyndnsclientRepository = MariaDbHelper.getRepository(DynDnsClientDB);
            const dyndnsclientDomainRepository = MariaDbHelper.getRepository(DynDnsClientDomainDB);

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

            client = await MariaDbHelper.getConnection().manager.save(client);

            // domain links --------------------------------------------------------------------------------------------

            if (request.domains.length === 0) {
                await dyndnsclientDomainRepository.delete({
                    dyndnsclient_id: client.id
                });
            } else {
                const odomains = await dyndnsclientDomainRepository.find({
                    dyndnsclient_id: client.id
                });

                if (odomains) {
                    const checkDomainExistence = (domainId: number): boolean => request.domains.some(({id}) => id === domainId);

                    for (const oldDomain of odomains) {
                        if (!checkDomainExistence(oldDomain.domain_id)) {
                            await dyndnsclientDomainRepository.delete({
                                id: oldDomain.id
                            });
                        }
                    }
                }

                // update or add ---------------------------------------------------------------------------------------

                for (const domain of request.domains) {
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

                    await MariaDbHelper.getConnection().manager.save(newDomain);
                }
            }

            return {
                status: 'ok'
            };
        }

        return {
            status: 'error',
            msg: 'Please login!'
        };
    }

}