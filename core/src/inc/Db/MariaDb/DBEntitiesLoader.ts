import {PluginManager} from '../../PluginSystem/PluginManager.js';
import {Credential} from './Entity/Credential.js';
import {CredentialUser} from './Entity/CredentialUser.js';
import {Domain} from './Entity/Domain.js';
import {DomainRecord} from './Entity/DomainRecord.js';
import {DynDnsClient} from './Entity/DynDnsClient.js';
import {DynDnsClientDomain} from './Entity/DynDnsClientDomain.js';
import {DynDnsServerDomain} from './Entity/DynDnsServerDomain.js';
import {DynDnsServerUser} from './Entity/DynDnsServerUser.js';
import {GatewayIdentifier} from './Entity/GatewayIdentifier.js';
import {IpBlacklist} from './Entity/IpBlacklist.js';
import {IpBlacklistCategory} from './Entity/IpBlacklistCategory.js';
import {IpBlacklistMaintainer} from './Entity/IpBlacklistMaintainer.js';
import {IpListMaintainer} from './Entity/IpListMaintainer.js';
import {IpLocation} from './Entity/IpLocation.js';
import {IpWhitelist} from './Entity/IpWhitelist.js';
import {NatPort} from './Entity/NatPort.js';
import {NginxHttp} from './Entity/NginxHttp.js';
import {NginxHttpVariable} from './Entity/NginxHttpVariable.js';
import {NginxListen} from './Entity/NginxListen.js';
import {NginxLocation} from './Entity/NginxLocation.js';
import {NginxStream} from './Entity/NginxStream.js';
import {NginxUpstream} from './Entity/NginxUpstream.js';
import {Settings} from './Entity/Settings.js';
import {SshPort} from './Entity/SshPort.js';
import {SshUser} from './Entity/SshUser.js';
import {User} from './Entity/User.js';
import {EntitySchema, MixedList} from 'typeorm';
import {ADBTableLoaderOnLoadEvent} from './ADBTableLoaderOnLoadEvent.js';

/**
 * DBEntitiesLoader
 */
export class DBEntitiesLoader {

    /**
     * loadEntities
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    public static async loadEntities(): Promise<MixedList<Function | string | EntitySchema>> {
        // eslint-disable-next-line @typescript-eslint/ban-types
        const list: MixedList<Function | string | EntitySchema> = [
            Credential,
            CredentialUser,
            Domain,
            DomainRecord,
            DynDnsClient,
            DynDnsClientDomain,
            DynDnsServerDomain,
            DynDnsServerUser,
            GatewayIdentifier,
            IpBlacklist,
            IpBlacklistCategory,
            IpBlacklistMaintainer,
            IpListMaintainer,
            IpLocation,
            IpWhitelist,
            NatPort,
            NginxHttp,
            NginxHttpVariable,
            NginxListen,
            NginxLocation,
            NginxStream,
            NginxUpstream,
            Settings,
            SshPort,
            SshUser,
            User
        ];

        // load entities from plugin -----------------------------------------------------------------------------------

        const events =
            PluginManager.getInstance().getAllEvents<ADBTableLoaderOnLoadEvent>(
                ADBTableLoaderOnLoadEvent
            );

        for await (const event of events) {
            const pList = await event.onRegisterEntities();

            for (const table of pList) {
                list.push(table);
            }
        }

        // -------------------------------------------------------------------------------------------------------------

        return list;
    }

}