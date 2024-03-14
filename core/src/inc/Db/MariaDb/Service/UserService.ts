import {Not} from 'typeorm';
import {DBService} from '../DBService.js';
import {User} from '../Entity/User.js';

/**
 * UserService
 */
export class UserService extends DBService<User> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'user';

    /**
     * getInstance
     */
    public static getInstance(): UserService {
        return DBService.getSingleInstance(
            UserService,
            User,
            UserService.REGISTER_NAME
        );
    }

    /**
     * findOneByEmail
     * @param email
     */
    public async findOneByEmail(email: string): Promise<User | null> {
        return this._repository.findOne({
            where: {
                email: email
            }
        });
    }

    /**
     * countDisable
     * @param disable
     */
    public async countDisable(disable: boolean): Promise<number> {
        return this._repository.countBy({
            disable: disable
        });
    }

    /**
     * existUsername
     * @param name
     * @param ownId
     */
    public async existUsername(name: string, ownId: number): Promise<boolean> {
        const count = await this._repository.countBy({
            username: name,
            id: Not(ownId)
        });

        return count > 0;
    }

    /**
     * existEmail
     * @param email
     * @param ownId
     */
    public async existEmail(email: string, ownId: number): Promise<boolean> {
        const count = await this._repository.countBy({
            email: email,
            id: Not(ownId)
        });

        return count > 0;
    }

}