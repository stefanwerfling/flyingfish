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
     * @param name
     * @param disable
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
     * @param domainname
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
     * getChildrenById
     * @param id
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
     * @param domain
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