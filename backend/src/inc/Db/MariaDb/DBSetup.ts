import * as bcrypt from 'bcrypt';
import {Logger} from '../../Logger/Logger';
import {NginxDomain as NginxDomainDB} from './Entity/NginxDomain';
import {ListenCategory, ListenTypes, NginxListen as NginxListenDB} from './Entity/NginxListen';
import {NginxStream as NginxStreamDB} from './Entity/NginxStream';
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

            Logger.getLogger().info('Admin user create for first init.');
        }

        const listenRepository = MariaDbHelper.getRepository(NginxListenDB);
        const listenCount = await listenRepository.count();

        if (listenCount === 0) {
            // add 443 listener
            let l443 = new NginxListenDB();
            l443.name = 'Stream SSL EXTERN';
            l443.listen_port = 443;
            l443.listen_type = ListenTypes.stream;
            l443.listen_category = ListenCategory.default_stream_ssl;
            l443.description = 'Stream/SSL Listener Extern';

            l443 = await MariaDbHelper.getConnection().manager.save(l443);

            // add 80 listener
            let l80 = new NginxListenDB();
            l80.name = 'Stream EXTERN';
            l80.listen_port = 80;
            l80.listen_type = ListenTypes.stream;
            l80.listen_category = ListenCategory.default_stream_nonessl;
            l80.description = 'Stream Listener Extern';

            l80 = await MariaDbHelper.getConnection().manager.save(l80);

            // add 10443 listener
            const l10443 = new NginxListenDB();
            l10443.name = 'HTTPS INTERN';
            l10443.listen_port = 10443;
            l10443.listen_type = ListenTypes.http;
            l10443.listen_category = ListenCategory.https;
            l10443.description = 'HTTPS Listener Intern';

            await MariaDbHelper.getConnection().manager.save(l10443);

            // add 10080 listener
            const l10080 = new NginxListenDB();
            l10080.name = 'HTTP INTERN';
            l10080.listen_port = 10080;
            l10080.listen_type = ListenTypes.http;
            l10080.listen_category = ListenCategory.http;
            l10080.description = 'HTTP Listener Intern';

            await MariaDbHelper.getConnection().manager.save(l10080);

            Logger.getLogger().info('Default listener create for first init.');

            // create default domain _ ---------------------------------------------------------------------------------

            let defaultDomain = new NginxDomainDB();
            defaultDomain.domainname = '_';

            defaultDomain = await MariaDbHelper.getConnection().manager.save(defaultDomain);

            // add stream _ --------------------------------------------------------------------------------------------
            const sTo10443 = new NginxStreamDB();
            sTo10443.domain_id = defaultDomain.id;
            sTo10443.listen_id = l443.id;
            sTo10443.alias_name = 'StreamTo10443';
            sTo10443.destination_address = '127.0.0.1';
            sTo10443.destination_port = 10443;
            sTo10443.isdefault = true;
            sTo10443.index = 9999;

            await MariaDbHelper.getConnection().manager.save(sTo10443);

            const sTo10080 = new NginxStreamDB();
            sTo10080.domain_id = defaultDomain.id;
            sTo10080.listen_id = l80.id;
            sTo10080.alias_name = 'StreamTo10080';
            sTo10080.destination_address = '127.0.0.1';
            sTo10080.destination_port = 10080;
            sTo10080.isdefault = true;
            sTo10080.index = 9999;

            await MariaDbHelper.getConnection().manager.save(sTo10080);
        }
    }

}