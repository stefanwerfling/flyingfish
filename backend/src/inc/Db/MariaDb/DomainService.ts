import {Repository, DeleteResult} from 'typeorm';
import {DBHelper} from './DBHelper.js';
import {Domain} from './Entity/Domain.js';

/**
 * DomainService
 */
export class DomainService {

    /**
     * repository for domain
     * @private
     */
    private static _repository: Repository<Domain>|null = null;

    /**
     * getRepository
     */
    public static getRepository(): Repository<Domain> {
        if (DomainService._repository === null) {
            DomainService._repository = DBHelper.getRepository(Domain);
        }

        return DomainService._repository;
    }

    /**
     * findAll
     */
    public static findAll(): Promise<Domain[]> {
        return DomainService.getRepository().find();
    }

    /**
     * findOne
     * @param id
     */
    public static findOne(id: number): Promise<Domain | null> {
        return DomainService.getRepository().findOne({
            where: {
                id: id
            }
        });
    }

    /**
     * findByName
     * @param name
     * @param disable
     */
    public static findByName(name: string, disable: boolean = false): Promise<Domain | null> {
        return DomainService.getRepository().findOne({
            where: {
                domainname: name,
                disable: disable
            }
        });
    }

    /**
     * remove
     * @param id
     */
    public static async remove(id: number): Promise<DeleteResult> {
        return DomainService.getRepository().delete(id);
    }

    /**
     * save
     * @param domain
     */
    public static async save(domain: Domain): Promise<Domain> {
        return DomainService.getRepository().save(domain);
    }

}