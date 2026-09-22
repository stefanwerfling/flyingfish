import {PluginManager} from '@stefanwerfling/figtree';
import {AcmeDnsTempRecord} from './Entity/AcmeDnsTempRecord.js';
import {CaCertificate} from './Entity/CaCertificate.js';
import {Credential} from './Entity/Credential.js';
import {CredentialLocation} from './Entity/CredentialLocation.js';
import {CredentialUser} from './Entity/CredentialUser.js';
import {DhcpLease} from './Entity/DhcpLease.js';
import {DhcpServerConfig} from './Entity/DhcpServerConfig.js';
import {Domain} from './Entity/Domain.js';
import {DomainRecord} from './Entity/DomainRecord.js';
import {DynDnsClient} from './Entity/DynDnsClient.js';
import {DynDnsClientDomain} from './Entity/DynDnsClientDomain.js';
import {DynDnsServerDomain} from './Entity/DynDnsServerDomain.js';
import {DynDnsServerUser} from './Entity/DynDnsServerUser.js';
import {EnrollmentRequest} from './Entity/EnrollmentRequest.js';
import {GatewayIdentifier} from './Entity/GatewayIdentifier.js';
import {IpBlacklist} from './Entity/IpBlacklist.js';
import {IpBlacklistCategory} from './Entity/IpBlacklistCategory.js';
import {IpBlacklistMaintainer} from './Entity/IpBlacklistMaintainer.js';
import {IpListMaintainer} from './Entity/IpListMaintainer.js';
import {IpLocation} from './Entity/IpLocation.js';
import {IpWhitelist} from './Entity/IpWhitelist.js';
import {IssuedCertificate} from './Entity/IssuedCertificate.js';
import {NatPolicy} from './Entity/NatPolicy.js';
import {NatPort} from './Entity/NatPort.js';
import {NetworkInterface} from './Entity/NetworkInterface.js';
import {PortForward} from './Entity/PortForward.js';
import {NginxHttp} from './Entity/NginxHttp.js';
import {NginxHttpVariable} from './Entity/NginxHttpVariable.js';
import {NginxListen} from './Entity/NginxListen.js';
import {NginxListenVariable} from './Entity/NginxListenVariable.js';
import {NginxLocation} from './Entity/NginxLocation.js';
import {NginxStream} from './Entity/NginxStream.js';
import {NginxUpstream} from './Entity/NginxUpstream.js';
import {RbacGroup} from './Entity/RbacGroup.js';
import {RbacPermission} from './Entity/RbacPermission.js';
import {RbacRole} from './Entity/RbacRole.js';
import {RbacRoleAssignment} from './Entity/RbacRoleAssignment.js';
import {RbacRolePermission} from './Entity/RbacRolePermission.js';
import {RbacUserGroup} from './Entity/RbacUserGroup.js';
import {Settings} from './Entity/Settings.js';
import {SshPort} from './Entity/SshPort.js';
import {SshUser} from './Entity/SshUser.js';
import {SystemConfig} from './Entity/SystemConfig.js';
import {User} from './Entity/User.js';
import {WanLease} from './Entity/WanLease.js';
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
            AcmeDnsTempRecord,
            CaCertificate,
            Credential,
            CredentialUser,
            CredentialLocation,
            DhcpLease,
            DhcpServerConfig,
            Domain,
            DomainRecord,
            DynDnsClient,
            DynDnsClientDomain,
            DynDnsServerDomain,
            DynDnsServerUser,
            EnrollmentRequest,
            GatewayIdentifier,
            IpBlacklist,
            IpBlacklistCategory,
            IpBlacklistMaintainer,
            IpListMaintainer,
            IpLocation,
            IpWhitelist,
            IssuedCertificate,
            NatPolicy,
            SystemConfig,
            NatPort,
            NetworkInterface,
            PortForward,
            NginxHttp,
            NginxHttpVariable,
            NginxListen,
            NginxListenVariable,
            NginxLocation,
            NginxStream,
            NginxUpstream,
            RbacGroup,
            RbacPermission,
            RbacRole,
            RbacRoleAssignment,
            RbacRolePermission,
            RbacUserGroup,
            Settings,
            SshPort,
            SshUser,
            User,
            WanLease
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