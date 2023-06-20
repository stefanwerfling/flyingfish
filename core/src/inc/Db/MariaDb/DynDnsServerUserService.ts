import {Repository} from 'typeorm';
import {DBHelper} from './DBHelper.js';
import {DynDnsServerUser} from './Entity/DynDnsServerUser.js';

/**
 * DynDnsServerUserService
 */
export class DynDnsServerUserService {

    /**
     * repository for dyndns server user
     * @private
     */
    private static _repository: Repository<DynDnsServerUser>|null = null;

    /**
     * getRepository
     */
    public static getRepository(): Repository<DynDnsServerUser> {
        if (DynDnsServerUserService._repository === null) {
            DynDnsServerUserService._repository = DBHelper.getRepository(DynDnsServerUser);
        }

        return DynDnsServerUserService._repository;
    }

    /**
     * findAll
     */
    public static findAll(): Promise<DynDnsServerUser[]> {
        return DynDnsServerUserService.getRepository().find();
    }

    /**
     * findOne
     * @param id
     */
    public static findOne(id: number): Promise<DynDnsServerUser | null> {
        return DynDnsServerUserService.getRepository().findOne({
            where: {
                id: id
            }
        });
    }

    /**
     * findByName
     * @param name
     */
    public static findByName(name: string): Promise<DynDnsServerUser | null> {
        return DynDnsServerUserService.getRepository().findOne({
            where: {
                username: name
            }
        });
    }

}