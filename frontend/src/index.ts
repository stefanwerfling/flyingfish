import {NavbarLinkButton, NavbarLinkFullsize} from 'bambooo';
import {ClusterNode} from 'flyingfish_schemas';
import {Login as LoginAPI} from './inc/Api/Login.js';
import {Registry as RegistryAPI} from './inc/Api/Registry.js';
import {User as UserAPI} from './inc/Api/User.js';
import {ClusterNav, NavModel} from './inc/Components/ClusterNav.js';
import {Lang} from './inc/Lang.js';
import {BasePage} from './inc/Pages/BasePage.js';
import {ClusterView} from './inc/Pages/ClusterView.js';
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
import {NodeCluster} from './inc/Pages/NodeCluster.js';
import {SystemMode, getNodeMode, loadNodeConfig} from './inc/Pages/SystemMode.js';
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

    // theme --------------------------------------------------------------------------------------------------------
    // Single source of truth for light/dark: data-theme on <html>. The whole app (dark
    // tree/topbar shell + the dark-skinned page content) keys off it. Initialised from the
    // saved preference, falling back to the OS setting; the navbar toggle flips + persists it.

    /**
     * Apply a theme by setting data-theme on the document root.
     * @param theme - 'dark' or 'light'
     */
    const applyTheme = (theme: string): void => {
        document.documentElement.setAttribute('data-theme', theme);
    };

    /**
     * Flip the current theme and persist the choice.
     */
    const toggleTheme = (): void => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';

        try {
            window.localStorage.setItem('ff-theme', next);
        } catch (e) {
            // storage may be unavailable (private mode) — the toggle still works for the session
        }

        applyTheme(next);
    };

    let saved: string | null = null;

    try {
        saved = window.localStorage.getItem('ff-theme');
    } catch (e) {
        saved = null;
    }

    applyTheme(saved ?? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

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
            'fa-adjust', () => {
                toggleTheme();
            }
        );
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

        // load the node config once (mode drives whether the Router category shows);
        // falls back to localStorage if the backend endpoint isn't available yet
        await loadNodeConfig();

        // Cluster node roster (9.5.12, Proxmox-style): the real federated node list from
        // the converged gossip aggregate, so the tree reflects live membership. `selfNodeUid`
        // marks which entry is THIS node. On a solo node — or before the local clusterserver
        // has gossiped — this is empty/null and the tree falls back to just this node.
        let roster: ClusterNode[] = [];
        let selfNodeUid: string | null = null;

        try {
            const nodesResponse = await RegistryAPI.getClusterNodes();
            roster = nodesResponse.list;
            selfNodeUid = nodesResponse.selfNodeUid;
        } catch (e) {
            // roster unavailable (not clustered / endpoint absent) — local node only
        }

        const selfEntry = selfNodeUid === null ? undefined : roster.find((n) => n.nodeUid === selfNodeUid);

        const navModel: NavModel = {
            datacenter: {
                id: 'dc',
                kind: 'datacenter',
                title: 'Datacenter',
                icon: '🛰️',
                avatar: '🛰️',
                subtitle: 'cluster control plane',
                // Only cluster-wide concerns: membership, enrollment, mesh, access control
                // and the shared trust anchor. Everything that configures a FlyingFish
                // instance (nginx, DNS, listeners, router, settings) lives on the node.
                tabs: [
                    {key: 'overview', label: 'Summary', icon: '📊', group: 'status', make: (): BasePage => new ClusterView('overview')},
                    {key: 'nodes', label: 'Nodes', icon: '🖥️', group: 'cluster', make: (): BasePage => new ClusterView('nodes')},
                    {key: 'groups', label: 'Groups', icon: '🗂️', group: 'cluster', make: (): BasePage => new ClusterView('groups')},
                    {key: 'enrollment', label: 'Enrollment', icon: '➕', group: 'cluster', make: (): BasePage => new ClusterView('enrollment')},
                    {key: 'topology', label: 'Topology', icon: '🕸️', group: 'cluster', make: (): BasePage => new ClusterView('topology')},
                    {key: 'users', label: 'Users & RBAC', icon: '👥', group: 'access', make: (): BasePage => new UsersPage()},
                    {key: 'pki', label: 'PKI (CA)', icon: '🔐', group: 'access', make: (): BasePage => new PkiPage()}
                ]
            },
            nodes: [
                {
                    // the local node — always first, with its full resource tree (this node's
                    // pages drive this backend). Identity/liveness come from the gossip roster
                    // when available, else a sensible default (solo / pre-gossip).
                    id: 'node:local',
                    kind: 'node',
                    title: selfEntry?.host || 'flyingfish-nuc',
                    icon: '🖥️',
                    avatar: '🖥️',
                    status: selfEntry && !selfEntry.online ? 'warn' : 'up',
                    badges: [{label: 'CA · Hub', cls: 'ca'}, {label: 'this node', cls: 'plain'}],
                    subtitle: 'this node',
                    // operating mode (frontend placeholder until the backend SystemConfig
                    // lands): 'attach' hides the Router category, 'router' shows it.
                    mode: getNodeMode(),
                    // the node dashboard sits directly under the node (above the categories)
                    leaves: [
                        {key: 'dashboard', label: 'Dashboard', icon: '📊', make: (): BasePage => new DashboardPage()}
                    ],
                    // a node's features grouped into the four pillars: System · Router ·
                    // Reverse Proxy · DNS. Each category expands to its pages in the tree.
                    groups: [
                        {
                            key: 'system', label: 'System', icon: '⚙️', leaves: [
                                {key: 'mode', label: 'Mode', icon: '🎛️', make: (): BasePage => new SystemMode()},
                                {key: 'gateway', label: 'Gateway', icon: '🌐', make: (): BasePage => new GatewayPage()},
                                {key: 'cluster', label: 'Cluster', icon: '🔗', make: (): BasePage => new NodeCluster()},
                                {key: 'registry', label: 'Registry', icon: '🧩', make: (): BasePage => new RegistryPage()}
                            ]
                        },
                        {
                            key: 'router', label: 'Router', icon: '🧭', leaves: [
                                {key: 'router', label: 'Router', icon: '🧭', make: (): BasePage => new RouterPage()},
                                {key: 'upnpnat', label: 'UpnpNat', icon: '🗺️', make: (): BasePage => new UpnpNatPage()}
                            ]
                        },
                        {
                            key: 'proxy', label: 'Reverse Proxy', icon: '🔀', leaves: [
                                {key: 'routes', label: 'Routes', icon: '🧵', make: (): BasePage => new RoutesPage()},
                                {key: 'listens', label: 'Listens', icon: '🚪', make: (): BasePage => new ListensPage()},
                                {key: 'credential', label: 'Credentials', icon: '📓', make: (): BasePage => new CredentialPage()},
                                {key: 'ipaccess', label: 'IP Access', icon: '🔒', make: (): BasePage => new IpAccess()},
                                {key: 'settings', label: 'Settings', icon: '⚙️', make: (): BasePage => new SettingsPage()}
                            ]
                        },
                        {
                            key: 'dns', label: 'DNS', icon: '🌐', leaves: [
                                {key: 'domains', label: 'Domains', icon: '🏷️', make: (): BasePage => new DomainsPage()},
                                {key: 'dyndnsserver', label: 'DynDns Server', icon: '🗄️', make: (): BasePage => new DynDnsServer()},
                                {key: 'dyndnsclients', label: 'DynDns Clients', icon: '📡', make: (): BasePage => new DynDnsClients()}
                            ]
                        }
                    ]
                }
            ]
        };

        ClusterNav.render(navModel, page.getName(), (p): void => {
            loadPage(p as BasePage);
        }, currentuser?.user?.username);

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