import {HttpRouteLoader, IDefaultRoute} from 'figtree';
import {Update as HimHipUpdateController} from '../../Routes/HimHip/Update.js';
import {Credential as CredentialController} from '../../Routes/Main/Credential.js';
import {Dashboard as DashboardController} from '../../Routes/Main/Dashboard.js';
import {Domain as DomainController} from '../../Routes/Main/Domain.js';
import {DynDnsClient as DynDnsClientController} from '../../Routes/Main/DynDnsClient.js';
import {DynDnsServer as DynDnsServerController} from '../../Routes/Main/DynDnsServer.js';
import {GatewayIdentifier as GatewayIdentifierController} from '../../Routes/Main/GatewayIdentifier.js';
import {IpAccess as IpAccessController} from '../../Routes/Main/IpAccess.js';
import {Listen as ListenController} from '../../Routes/Main/Listen.js';
import {Login as LoginController} from '../../Routes/Main/Login.js';
import {Nginx as NginxController} from '../../Routes/Main/Nginx.js';
import {Registry as RegistryController} from '../../Routes/Main/Registry.js';
import {Route as RouteController} from '../../Routes/Main/Route.js';
import {Settings as SettingsController} from '../../Routes/Main/Settings.js';
import {Ssh as SshController} from '../../Routes/Main/Ssh.js';
import {Ssl as SslController} from '../../Routes/Main/Ssl.js';
import {UpnpNat as UpnpNatController} from '../../Routes/Main/UpnpNat.js';
import {User as UserController} from '../../Routes/Main/User.js';

/**
 * RouteLoader
 *
 * Supplies the express route controllers to figtree's `HttpService`.
 * The controllers still extend `flyingfish_core`'s `DefaultRoute`, which
 * structurally satisfies figtree's `IDefaultRoute` (`getExpressRouter()`).
 */
export class RouteLoader extends HttpRouteLoader {

    /**
     * Load the routes for the HTTP server.
     * @return {Promise<IDefaultRoute[]>}
     */
    public static override async loadRoutes(): Promise<IDefaultRoute[]> {
        return [
            new LoginController(),
            new UserController(),
            new DomainController(),
            new DynDnsClientController(),
            new DynDnsServerController(),
            new RouteController(),
            new ListenController(),
            new UpnpNatController(),
            new NginxController(),
            new DashboardController(),
            new GatewayIdentifierController(),
            new IpAccessController(),
            new SslController(),
            new SshController(),
            new SettingsController(),
            new CredentialController(),
            new RegistryController(),

            new HimHipUpdateController()
        ];
    }

}