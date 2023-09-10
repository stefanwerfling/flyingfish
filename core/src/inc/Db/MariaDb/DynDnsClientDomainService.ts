import {DeleteResult} from 'typeorm';
import {DBService} from './DBService.js';
import {DynDnsClientDomain} from './Entity/DynDnsClientDomain.js';

/**
 * DynDnsClientDomainService
 */
export class DynDnsClientDomainService extends DBService<DynDnsClientDomain> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'dyndns_client_domain';

    /**
     * getInstance
     */
    public static getInstance(): DynDnsClientDomainService {
        return DBService.getSingleInstance(
            DynDnsClientDomainService,
            DynDnsClientDomain,
            DynDnsClientDomainService.REGISTER_NAME
        );
    }

    /**
     * Find all client domains by client id.
     * @param {number} clientId - A client id.
     * @returns {DynDnsClientDomain[]}
     */
    public async findAllByClientId(clientId: number): Promise<DynDnsClientDomain[]> {
        return this._repository.find({
            where: {
                dyndnsclient_id: clientId
            }
        });
    }

    /**
     * Remove all entries by client id.
     * @param {number} clientId - A Client id.
     * @returns {DeleteResult}
     */
    public async removeByClientId(clientId: number): Promise<DeleteResult> {
        return this._repository.delete({
            dyndnsclient_id: clientId
        });
    }

    /**
     * Find link domain by domain id and client id.
     * @param {number} domainId - An ID from a domain.
     * @param {number} clientId - An ID from a client.
     * @returns {DynDnsClientDomain|null} Data or null.
     */
    public async findByDomainId(domainId: number, clientId: number): Promise<DynDnsClientDomain|null> {
        return this._repository.findOne({
            where: {
                domain_id: domainId,
                dyndnsclient_id: clientId
            }
        });
    }

}