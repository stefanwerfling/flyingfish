import * as bcrypt from 'bcrypt';
import {ListenTypes, NginxListen as NginxListenDB} from './Entity/NginxListen';
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
        const userRepository = MariaDbHelper.getRepository(UserDB);
        const userCount = await userRepository.count();

        if (userCount === 0) {
            const nUser = new UserDB();
            nUser.username = 'ffadmin';
            nUser.email = 'admin@flyingfish.org';
            nUser.password = await bcrypt.hash('changeMyPassword', 10);
            nUser.disable = false;

            // save user to db
            await MariaDbHelper.getConnection().manager.save(nUser);

            console.log('Admin user create for first init.');
        }

        const listenRepository = MariaDbHelper.getRepository(NginxListenDB);
        const listenCount = await listenRepository.count();

        if (listenCount === 0) {
            // add 443 listener
            const l443 = new NginxListenDB();
            l443.name = 'HTTPS/SSL EXTERN';
            l443.listen_port = 443;
            l443.listen_type = ListenTypes.stream;
            l443.description = 'HTTPS/SSL Listener Extern';

            await MariaDbHelper.getConnection().manager.save(l443);

            // add 80 listener
            const l80 = new NginxListenDB();
            l80.name = 'HTTP EXTERN';
            l80.listen_port = 80;
            l80.listen_type = ListenTypes.stream;
            l80.description = 'HTTP Listener Extern';

            await MariaDbHelper.getConnection().manager.save(l80);

            // add 10443 listener
            const l10443 = new NginxListenDB();
            l10443.name = 'HTTPS INTERN';
            l10443.listen_port = 10443;
            l10443.listen_type = ListenTypes.http;
            l10443.description = 'HTTPS Listener Intern';

            await MariaDbHelper.getConnection().manager.save(l10443);

            // add 10080 listener
            const l10080 = new NginxListenDB();
            l10080.name = 'HTTP INTERN';
            l10080.listen_port = 10080;
            l10080.listen_type = ListenTypes.http;
            l10080.description = 'HTTP Listener Intern';

            await MariaDbHelper.getConnection().manager.save(l10080);

            console.log('Default listener create for first init.');
        }
    }

}