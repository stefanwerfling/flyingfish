import * as bcrypt from 'bcrypt';
import {DBHelper, DomainDB, DomainServiceDB, Logger, NginxUpstreamDB, UserDB, UserServiceDB, NginxUpstreamServiceDB} from 'flyingfish_core';
import {ListenCategory, ListenProtocol, ListenTypes, NginxListen as NginxListenDB} from './Entity/NginxListen.js';
import {NginxStream as NginxStreamDB, NginxStreamDestinationType} from './Entity/NginxStream.js';

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
        const us = UserServiceDB.getInstance();
        const userCount = await us.countAll();

        if (userCount === 0) {
            const nUser = new UserDB();
            nUser.username = 'ffadmin';
            nUser.email = 'admin@flyingfish.org';
            nUser.password = await bcrypt.hash('changeMyPassword', 10);
            nUser.disable = false;

            // save user to db
            await us.save(nUser);

            Logger.getLogger().info('Admin user create for first init.');
        }

        const listenRepository = DBHelper.getRepository(NginxListenDB);
        const listenCount = await listenRepository.count();

        if (listenCount > 0) {
            return;
        }

        // add 53 listener
        let l53 = new NginxListenDB();
        l53.name = 'Stream DNS EXTERN';
        l53.description = 'Stream DNS TCP/UDP Listener Extern';
        l53.listen_port = 53;
        l53.listen_protocol = ListenProtocol.tcp_udp;
        l53.listen_type = ListenTypes.stream;
        l53.listen_category = ListenCategory.default_stream_nonessl;
        l53.fixlisten = true;
        l53.routeless = true;

        l53 = await DBHelper.getDataSource().manager.save(l53);

        // add 443 listener
        let l443 = new NginxListenDB();
        l443.name = 'Stream SSL EXTERN';
        l443.listen_port = 443;
        l443.listen_type = ListenTypes.stream;
        l443.listen_category = ListenCategory.default_stream_ssl;
        l443.description = 'Stream/SSL Listener Extern';
        l443.fixlisten = true;
        l443.proxy_protocol = true;

        l443 = await DBHelper.getDataSource().manager.save(l443);

        // add 80 listener
        let l80 = new NginxListenDB();
        l80.name = 'Stream EXTERN';
        l80.listen_port = 80;
        l80.listen_type = ListenTypes.stream;
        l80.listen_category = ListenCategory.default_stream_nonessl;
        l80.description = 'Stream Listener Extern';
        l80.fixlisten = true;
        l80.proxy_protocol = true;

        l80 = await DBHelper.getDataSource().manager.save(l80);

        // add 10443 listener
        let l10443 = new NginxListenDB();
        l10443.name = 'HTTPS INTERN';
        l10443.listen_port = 10443;
        l10443.listen_type = ListenTypes.http;
        l10443.listen_category = ListenCategory.default_https;
        l10443.description = 'HTTPS Listener Intern';
        l10443.fixlisten = true;

        l10443 = await DBHelper.getDataSource().manager.save(l10443);

        // add 10080 listener
        let l10080 = new NginxListenDB();
        l10080.name = 'HTTP INTERN';
        l10080.listen_port = 10080;
        l10080.listen_type = ListenTypes.http;
        l10080.listen_category = ListenCategory.default_http;
        l10080.description = 'HTTP Listener Intern';
        l10080.fixlisten = true;

        l10080 = await DBHelper.getDataSource().manager.save(l10080);

        // add 10081 listener status
        const l10081 = new NginxListenDB();
        l10081.name = 'STATUS INTERN';
        l10081.listen_port = 10081;
        l10081.listen_type = ListenTypes.http;
        l10081.listen_category = ListenCategory.status;
        l10081.description = 'Status Listener Intern';
        l10081.routeless = true;
        l10081.fixlisten = true;

        await DBHelper.getDataSource().manager.save(l10081);

        Logger.getLogger().info('Default listener create for first init.');

        // create default domain _ ---------------------------------------------------------------------------------

        let defaultDomain = new DomainDB();
        defaultDomain.domainname = '_';
        defaultDomain.fixdomain = true;
        defaultDomain.recordless = true;

        defaultDomain = await DomainServiceDB.getInstance().save(defaultDomain);

        // add streams _ --------------------------------------------------------------------------------------------

        let sTo5333 = new NginxStreamDB();
        sTo5333.domain_id = defaultDomain.id;
        sTo5333.listen_id = l53.id;
        sTo5333.alias_name = 'StreamTo5333';
        sTo5333.isdefault = true;
        sTo5333.index = 9999;
        sTo5333.destination_type = NginxStreamDestinationType.upstream;

        sTo5333 = await DBHelper.getDataSource().manager.save(sTo5333);

        const sTo5333Up = new NginxUpstreamDB();
        sTo5333Up.stream_id = sTo5333.id;
        sTo5333Up.destination_address = '127.0.0.1';
        sTo5333Up.destination_port = 5333;

        await NginxUpstreamServiceDB.getInstance().save(sTo5333Up);

        const sTo10443 = new NginxStreamDB();
        sTo10443.domain_id = defaultDomain.id;
        sTo10443.listen_id = l443.id;
        sTo10443.alias_name = 'StreamTo10443';
        sTo10443.isdefault = true;
        sTo10443.index = 9999;
        sTo10443.destination_type = NginxStreamDestinationType.listen;
        sTo10443.destination_listen_id = l10443.id;

        await DBHelper.getDataSource().manager.save(sTo10443);

        const sTo10080 = new NginxStreamDB();
        sTo10080.domain_id = defaultDomain.id;
        sTo10080.listen_id = l80.id;
        sTo10080.alias_name = 'StreamTo10080';
        sTo10080.isdefault = true;
        sTo10080.index = 9999;
        sTo10080.destination_type = NginxStreamDestinationType.listen;
        sTo10080.destination_listen_id = l10080.id;

        await DBHelper.getDataSource().manager.save(sTo10080);
    }

}