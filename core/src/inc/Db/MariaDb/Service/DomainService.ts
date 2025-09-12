import {DBService} from '../DBService.js';
import {Domain} from '../Entity/Domain.js';

/**
 * DomainService
 */
export class DomainService extends DBService<Domain> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'domain';

    /**
     * getInstance
     * @return {DomainService}
     */
    public static getInstance(): DomainService {
        return DBService.getSingleInstance(
            DomainService,
            Domain,
            DomainService.REGISTER_NAME
        );
    }

    /**
     * findByName
     * @param {string} name
     * @param {boolean} disable
     * @returns {Domain | null}
     */
    public findByName(name: string, disable: boolean = false): Promise<Domain | null> {
        return this._repository.findOne({
            where: {
                domainname: name,
                disable: disable
            }
        });
    }

    /**
     * findParentId
     * @param {string} domainname
     * @return {number}
     */
    public async findParentId(domainname: string): Promise<number> {
        const parts = domainname.split('.');

        if (parts.length <= 1) {
            return 0;
        }

        parts.shift();
        const parentDomainname = parts.join('.');

        const domain = await this.findByName(parentDomainname);

        if (domain) {
            return domain.id;
        }

        return this.findParentId(parentDomainname);
    }

    /**
     * findAllParents
     * @param {string} domainname
     * @returns {Domain[]}
     */
    public async findAllParents(domainname: string): Promise<Domain[]> {
        const parts = domainname.split('.');
        const nameList: string[] = [];

        if (parts.length <= 1) {
            return [];
        }

        while (parts.length > 1) {
            parts.shift();

            nameList.push(parts.join('.'));
        }

        let query = this._repository.createQueryBuilder('domain');

        let isFirstWhere = true;

        for (const dname of nameList) {
            if (isFirstWhere) {
                isFirstWhere = false;
                query = query.where({
                    domainname: dname
                });
            } else {
                query = query.orWhere({
                    domainname: dname
                });
            }
        }

        return query.getMany();
    }

    /**
     * getChildrenById
     * @param {number} id
     * @returns {Domain[]}
     */
    public async getChildrenById(id: number): Promise<Domain[]> {
        return this._repository.find({
            where: {
                parent_id: id
            }
        });
    }

    /**
     * updateChildrenToNewParent
     * @param {Domain} domain
     */
    public async updateChildrenToNewParent(domain: Domain): Promise<void> {
        if (domain.parent_id === 0) {
            return;
        }

        const domainNameParts = domain.domainname.split('.').reverse();
        const childrens = await this.getChildrenById(domain.parent_id);

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
                    await this.save(aChildren);
                }
            }
        }
    }

}