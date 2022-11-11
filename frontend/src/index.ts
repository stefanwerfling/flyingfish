import {Login as LoginAPI} from './inc/Api/Login';
import {User as UserAPI} from './inc/Api/User';
import {SidebarMenuItem} from './inc/Bambooo/Sidebar/SidebarMenuItem';
import {NavbarLinkFullsize} from './inc/Bambooo/Navbar/NavbarLinkFullsize';
import {NavbarLinkButton} from './inc/Bambooo/Navbar/NavbarLinkButton';
import {SidebarMenuTree} from './inc/Bambooo/Sidebar/SidebarMenuTree';
import {Lang} from './inc/Lang';
import {BasePage} from './inc/Pages/BasePage';
import {Domains as DomainsPage} from './inc/Pages/Domains';
import {DynDnsClients} from './inc/Pages/DynDnsClients';
import {Listens as ListensPage} from './inc/Pages/Listens';
import {DnsResolver} from './inc/Pages/DnsResolver';
import {Routes as RoutesPage} from './inc/Pages/Routes';
import {Settings as SettingsPage} from './inc/Pages/Settings';
import {UpnpNat as UpnpNatPage} from './inc/Pages/UpnpNat';
import {Gateway as GatewayPage} from './inc/Pages/Gateway';
import {UtilAvatarGenerator} from './inc/Utils/UtilAvatarGenerator';
import {UtilColor} from './inc/Utils/UtilColor';
import {UtilRedirect} from './inc/Utils/UtilRedirect';

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

        // sidemenu ------------------------------------------------------------------------------------------------
        const sidemenuList = [
            {
                title: 'Listens',
                icon: 'fa-solid fa-door-open',
                name: 'listens',
                onClick: (): void => {
                    loadPage(new ListensPage());
                },
                items: [
                    {
                        title: 'Gateway Identifier',
                        icon: 'fa-solid fa-globe',
                        name: 'gateway',
                        onClick: (): void => {
                            loadPage(new GatewayPage());
                        }
                    },
                    {
                        title: 'UpnpNat',
                        icon: 'fa-solid fa-map-signs',
                        name: 'upnpnat',
                        onClick: (): void => {
                            loadPage(new UpnpNatPage());
                        }
                    }
                ]
            },
            {
                title: 'Domains',
                icon: 'fa-solid fa-tags',
                name: 'domains',
                onClick: (): void => {
                    loadPage(new DomainsPage());
                },
                items: [
                    {
                        title: 'Dns-Resolver',
                        name: 'dnsresolver',
                        icon: 'fa-solid fa-tag',
                        onClick: (): void => {
                            loadPage(new DnsResolver())
                        }
                    },
                    {
                        title: 'DynDns Clients',
                        name: 'dyndnsclients',
                        icon: 'fa-solid fa-satellite-dish',
                        onClick: (): void => {
                            loadPage(new DynDnsClients())
                        }
                    },
                    {
                        title: 'DynDns Server',
                        name: 'dyndnsserver',
                        icon: 'fa-solid fa-server',
                        onClick: (): void => {
                            loadPage(new DynDnsClients())
                        }
                    }
                ]
            },
            {
                title: 'Routes',
                icon: 'fa-solid fa-route',
                name: 'routes',
                onClick: (): void => {
                    loadPage(new RoutesPage());
                }
            },
            {
                title: 'Settings',
                icon: 'fa-cogs',
                name: 'settings',
                onClick: (): void => {
                    loadPage(new SettingsPage());
                }
            }
        ];

        const menu = page.getWrapper().getMainSidebar().getSidebar().getMenu();

        for (const item of sidemenuList) {
            const menuItem = new SidebarMenuItem(menu);

            menuItem.setName(item.name);
            menuItem.setTitle(item.title);
            menuItem.setIconClass(item.icon);

            menuItem.setClick(item.onClick);

            let isSubActiv = false;

            if (item.items) {
                const menuTree = new SidebarMenuTree(menuItem);

                for( const sitem of item.items) {
                    const pmenuItem = new SidebarMenuItem(menuTree, true);
                    pmenuItem.setTitle(sitem.title);
                    pmenuItem.setName(sitem.name);
                    pmenuItem.setClick(sitem.onClick);

                    if (sitem.icon) {
                        pmenuItem.setIconClass(sitem.icon);
                    }

                    if (page.getName() === sitem.name) {
                        pmenuItem.setActiv(true);
                        isSubActiv = true;
                    }
                }
            }

            if ( (page.getName() === item.name) || isSubActiv) {
                menuItem.setActiv(true);
            }
        }

        menu.initTreeview();

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

    await loadPage(new RoutesPage());
})();