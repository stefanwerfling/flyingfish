import {NavbarLinkButton, NavbarLinkFullsize} from 'bambooo';
import {Login as LoginAPI} from './inc/Api/Login.js';
import {User as UserAPI} from './inc/Api/User.js';
import {ClusterNav, NavModel} from './inc/Components/ClusterNav.js';
import {Lang} from './inc/Lang.js';
import {BasePage} from './inc/Pages/BasePage.js';
import {Credential as CredentialPage} from './inc/Pages/Credential.js';
import {Dashboard as DashboardPage} from './inc/Pages/Dashboard.js';
import {Domains as DomainsPage} from './inc/Pages/Domains.js';
import {DynDnsClients} from './inc/Pages/DynDnsClients.js';
import {DynDnsServer} from './inc/Pages/DynDnsServer.js';
import {IpAccess} from './inc/Pages/IpAccess.js';
import {Listens as ListensPage} from './inc/Pages/Listens.js';
import {Routes as RoutesPage} from './inc/Pages/Routes.js';
import {Router as RouterPage} from './inc/Pages/Router.js';
import {Settings as SettingsPage} from './inc/Pages/Settings.js';
import {UpnpNat as UpnpNatPage} from './inc/Pages/UpnpNat.js';
import {Gateway as GatewayPage} from './inc/Pages/Gateway.js';
import {Pki as PkiPage} from './inc/Pages/Pki.js';
import {Registry as RegistryPage} from './inc/Pages/Registry.js';
import {Users as UsersPage} from './inc/Pages/Users.js';
import {UtilAvatarGenerator} from './inc/Utils/UtilAvatarGenerator.js';
import {UtilColor} from './inc/Utils/UtilColor.js';
import {UtilRedirect} from './inc/Utils/UtilRedirect.js';

/**
 * Main function for ready document
 */
(async(): Promise<void> => {

    Lang.i('Lang_EN');
    jQuery('#ff_page_title').html(Lang.i().l('title'));

    let globalPage: BasePage|null = null;

    /**
     * loadPage
     * @param page
     */
    const loadPage = async(page: BasePage): Promise<void> => {
        page.setLoadPageFn(loadPage);

        const preloader = page.getWrapper().getPreloader();

        // is login ----------------------------------------------------------------------------------------------------

        if (!await LoginAPI.isLogin()) {
            UtilRedirect.toLogin();
        }

        const currentuser = await UserAPI.getUserInfo();

        if (currentuser) {
            const up = page.getWrapper().getMainSidebar().getSidebar().getUserPanel();

            up.setImage(
                UtilAvatarGenerator.generateAvatar(
                    currentuser.user?.username!,
                    'white',
                    UtilColor.getColor(currentuser.user?.username!)
                )
            );

            up.setUsername(currentuser.user?.username!);
        }

        // right navbar --------------------------------------------------------------------------------------------

        const rightNavbar = page.getWrapper().getNavbar().getRightNavbar();
        // eslint-disable-next-line no-new
        new NavbarLinkFullsize(rightNavbar.getElement());
        // eslint-disable-next-line no-new
        new NavbarLinkButton(
            rightNavbar.getElement(),
            'fa-sign-out-alt', async() => {
                if (confirm('Logout?')) {
                    await LoginAPI.logout();
                    UtilRedirect.toLogin();
                }
            }
        );

        // navigation --------------------------------------------------------------------------------------------------
        // The whole app is navigated through the cluster entity tree (Datacenter → nodes),
        // which replaces the admin-lte sidebar. Every tab reuses an existing page; the tree
        // is the single navigation (no separate menu). See {@link ClusterNav}.

        const navModel: NavModel = {
            datacenter: {
                id: 'dc',
                kind: 'datacenter',
                title: 'Datacenter',
                icon: '🛰️',
                avatar: '🛰️',
                subtitle: 'cluster-wide configuration',
                count: {n: '1'},
                tabs: [
                    {key: 'dashboard', label: 'Dashboard', icon: '📊', make: (): BasePage => new DashboardPage()},
                    {key: 'domains', label: 'Domains', icon: '🏷️', make: (): BasePage => new DomainsPage()},
                    {key: 'dyndnsclients', label: 'DynDns Clients', icon: '📡', make: (): BasePage => new DynDnsClients()},
                    {key: 'dyndnsserver', label: 'DynDns Server', icon: '🗄️', make: (): BasePage => new DynDnsServer()},
                    {key: 'credential', label: 'Credential', icon: '📓', make: (): BasePage => new CredentialPage()},
                    {key: 'routes', label: 'Routes', icon: '🧵', make: (): BasePage => new RoutesPage()},
                    {key: 'users', label: 'Users', icon: '👥', make: (): BasePage => new UsersPage()},
                    {key: 'registry', label: 'Registry', icon: '🧩', make: (): BasePage => new RegistryPage()},
                    {key: 'pki', label: 'PKI', icon: '🔐', make: (): BasePage => new PkiPage()},
                    {key: 'settings', label: 'Settings', icon: '⚙️', make: (): BasePage => new SettingsPage()}
                ]
            },
            nodes: [
                {
                    id: 'node:local',
                    kind: 'node',
                    title: 'flyingfish-nuc',
                    icon: '🖥️',
                    avatar: '🖥️',
                    status: 'up',
                    badges: [{label: 'CA · Hub', cls: 'ca'}, {label: 'this node', cls: 'plain'}],
                    subtitle: 'this node',
                    resources: [
                        {id: 'res:router', title: 'Router', icon: '🧭', tabKey: 'router'},
                        {id: 'res:listens', title: 'Listens', icon: '🚪', tabKey: 'listens'}
                    ],
                    tabs: [
                        {key: 'listens', label: 'Listens', icon: '🚪', make: (): BasePage => new ListensPage()},
                        {key: 'ipaccess', label: 'IP Access', icon: '🔒', make: (): BasePage => new IpAccess()},
                        {key: 'gateway', label: 'Gateway', icon: '🌐', make: (): BasePage => new GatewayPage()},
                        {key: 'upnpnat', label: 'UpnpNat', icon: '🗺️', make: (): BasePage => new UpnpNatPage()},
                        {key: 'router', label: 'Router', icon: '🧭', make: (): BasePage => new RouterPage()}
                    ]
                }
            ]
        };

        ClusterNav.render(navModel, page.getName(), (p): void => {
            loadPage(p as BasePage);
        });

        // ---------------------------------------------------------------------------------------------------------

        jQuery('#ccc_copyright').html(Lang.i().l('copyrightname'));
        jQuery('#ccc_version').html(Lang.i().l('version'));

        // ---------------------------------------------------------------------------------------------------------

        if (globalPage) {
            globalPage.unloadContent();
        }

        page.loadContent();
        preloader.readyLoad();

        globalPage = page;
    };

    await loadPage(new DashboardPage());
})();