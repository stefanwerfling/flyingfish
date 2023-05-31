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

    /**
     * findParentId
     * @param domainname
     */
    public static async findParentId(domainname: string): Promise<number> {
        const parts = domainname.split('.');

        if (parts.length <= 1) {
            return 0;
        }

        parts.shift();
        const parentDomainname = parts.join('.');

        const domain = await DomainService.findByName(parentDomainname);

        if (domain) {
            return domain.id;
        }

        return DomainService.findParentId(parentDomainname);
    }

    /**
     * getChildrenById
     * @param id
     */
    public static async getChildrenById(id: number): Promise<Domain[]> {
        return DomainService.getRepository().find({
            where: {
                parent_id: id
            }
        });
    }

    /**
     * updateChildrenToNewParent
     * @param oldParent
     * @param newParent
     */
    public static async updateChildrenToNewParent(domain: Domain): Promise<void> {
        if (domain.parent_id === 0) {
            return;
        }

        const domainNameParts = domain.domainname.split('.').reverse();
        const childrens = await DomainService.getChildrenById(domain.parent_id);

        for await (const aChildren of childrens) {
            if (aChildren.id === domain.id) {
                continue;
            }

            const cDomainNameParts = aChildren.domainname.split('.').reverse();

            if (cDomainNameParts.length > domainNameParts.length) {
                let isSubDomain = true;

                for (let i = 0; i < domainNameParts.length; i++) {
                    if (domainNameParts[i] !== cDomainNameParts[i]) {
                        isSubDomain = false;
                        break;
                    }
                }

                if (isSubDomain) {
                    aChildren.parent_id = domain.id;
                    await DomainService.save(aChildren);
                }
            }
        }
    }

}