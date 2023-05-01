import {Router} from 'express';
import {DefaultReturn, DefaultRoute, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {DynDnsClient as DynDnsClientDB} from '../../inc/Db/MariaDb/Entity/DynDnsClient.js';
import {DynDnsClientDomain as DynDnsClientDomainDB} from '../../inc/Db/MariaDb/Entity/DynDnsClientDomain.js';
import {Domain as DomainDB} from '../../inc/Db/MariaDb/Entity/Domain.js';
import {DynDnsProvider, DynDnsProviders} from '../../inc/Provider/DynDnsProviders.js';

/**
 * DynDnsClientDomain
 */
export const SchemaDynDnsClientDomain = Vts.object({
    id: Vts.number(),
    name: Vts.string()
});

export type DynDnsClientDomain = ExtractSchemaResultType<typeof SchemaDynDnsClientDomain>;

/**
 * DynDnsClientProvider
 */
export const SchemaDynDnsClientProvider = Vts.object({
    name: Vts.string(),
    title: Vts.string()
});

/**
 * DynDnsClientData
 */
export const SchemaDynDnsClientData = Vts.object({
    id: Vts.number(),
    domains: Vts.array(SchemaDynDnsClientDomain),
    provider: SchemaDynDnsClientProvider,
    username: Vts.string(),
    password: Vts.optional(Vts.string()),
    update_domain: Vts.boolean(),
    last_status: Vts.number(),
    last_status_msg: Vts.string(),
    last_update: Vts.number()
});

export type DynDnsClientData = ExtractSchemaResultType<typeof SchemaDynDnsClientData>;

/**
 * DynDnsClientDelete
 */
export const SchemaDynDnsClientDelete = Vts.object({
    id: Vts.number()
});

export type DynDnsClientDelete = ExtractSchemaResultType<typeof SchemaDynDnsClientDelete>;

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
export class DynDnsClient extends DefaultRoute {

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * getList
     */
    public async getList(): Promise<DynDnsClientListResponse> {
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

    /**
     * getProviders
     */
    public async getProviders(): Promise<DynDnsClientProviderListResponse> {
        return {
            statusCode: StatusCodes.OK,
            list: DynDnsProviders.getProviders()
        };
    }

    /**
     * saveClient
     * @param data
     */
    public async saveClient(data: DynDnsClientData): Promise<DefaultReturn> {
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

    /**
     * deleteClient
     * @param data
     */
    public async deleteClient(data: DynDnsClientDelete): Promise<DefaultReturn> {
        const dyndnsclientRepository = DBHelper.getRepository(DynDnsClientDB);
        const dyndnsclientDomainRepository = DBHelper.getRepository(DynDnsClientDomainDB);

        const tclient = await dyndnsclientRepository.findOne({
            where: {
                id: data.id
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

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/dyndnsclient/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getList());
                }
            }
        );

        this._routes.get(
            '/json/dyndnsclient/provider/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getProviders());
                }
            }
        );

        this._routes.post(
            '/json/dyndnsclient/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaDynDnsClientData, req.body, res)) {
                        res.status(200).json(await this.saveClient(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/dyndnsclient/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaDynDnsClientDelete, req.body, res)) {
                        res.status(200).json(await this.deleteClient(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}