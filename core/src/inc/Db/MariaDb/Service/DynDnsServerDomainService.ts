import {DeleteResult} from 'typeorm';
import {DBService} from '../DBService.js';
import {DomainService} from './DomainService.js';
import {Domain} from '../Entity/Domain.js';
import {DynDnsServerDomain} from '../Entity/DynDnsServerDomain.js';

/**
 * DynDnsServerDomainService
 */
export class DynDnsServerDomainService extends DBService<DynDnsServerDomain> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'dyndns_server_domain';

    /**
     * getInstance
     */
    public static getInstance(): DynDnsServerDomainService {
        return DBService.getSingleInstance(
            DynDnsServerDomainService,
            DynDnsServerDomain,
            DynDnsServerDomainService.REGISTER_NAME
        );
    }

    /**
     * Find all entries by user ID.
     * @param {number} userid - DynDns Server user ID.
     */
    public async findByUser(userid: number): Promise<DynDnsServerDomain[]> {
        return this._repository.find({
            where: {
                user_id: userid
            }
        });
    }

    /**
     * Remove all domain links by user ID.
     * @param {number} userId - DynDns Server user ID.
     * @returns {DeleteResult}
     */
    public async removeByUserId(userId: number): Promise<DeleteResult> {
        return this._repository.delete({
            user_id: userId
        });
    }

    /**
     * Find domain by user ID and domain ID.
     * @param {number} domainId
     * @param {number} userId
     * @returns {DynDnsServerDomain|null}
     */
    public async findByDomainId(domainId: number, userId: number): Promise<DynDnsServerDomain|null> {
        return this._repository.findOne({
            where: {
                domain_id: domainId,
                user_id: userId
            }
        });
    }

    /**
     * Return all domains that not used in dyndns server domain.
     * @returns {Domain[]}
     */
    public async getDomainListByNotUsed(): Promise<Domain[]> {
        const bQry = this._repository
        .createQueryBuilder()
        .select('domain_id');

        const domainInt = DomainService.getInstance();
        const domainRepo = domainInt.getRepository();
        const notInDomains = domainRepo.createQueryBuilder()
        .where(`${domainInt.getTableName()}.id NOT IN (${bQry.getSql()})`);

        return notInDomains.getMany();
    }

}