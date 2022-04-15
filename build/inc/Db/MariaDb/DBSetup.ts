import * as bcrypt from 'bcrypt';
import {User as UserDB} from './Entity/User';
import {MariaDbHelper} from './MariaDbHelper';

/**
 * DBSetup
 * init db for first start with a default:
 *  - user
 */
export class DBSetup {

    /**
     * firstInit
     */
    public static async firstInit(): Promise<void> {
        const userRepository = MariaDbHelper.getConnection().getRepository(UserDB);
        const userCount = await userRepository.count();

        if (userCount === 0) {
            const nUser = new UserDB();
            nUser.username = 'ffadmin';
            nUser.password = await bcrypt.hash('changeMyPassword', 10);
            nUser.disable = false;

            // save user to db
            await MariaDbHelper.getConnection().manager.save(nUser);

            console.log('Admin user create for first init.');
        }
    }

}