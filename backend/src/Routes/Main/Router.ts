import {Router as ExpressRouter} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {
    DhcpLeaseDB,
    DhcpServerConfigDB,
    DhcpServerConfigServiceDB,
    DhcpLeaseServiceDB,
    NatPolicyDB,
    NatPolicyServiceDB,
    NetworkInterfaceDB,
    NetworkInterfaceServiceDB,
    PortForwardDB,
    PortForwardServiceDB,
    resolveNftablesRouterConfig,
    WanLeaseDB,
    WanLeaseServiceDB
} from 'flyingfish_core';
import {
    AvailableInterface,
    DefaultReturn,
    RouterLanConfigResponse,
    RouterNetfilterConfigResponse,
    RouterOverviewResponse,
    SchemaAvailableInterfacesReport,
    SchemaDefaultReturn,
    SchemaDhcpLeasesReport,
    SchemaDhcpServerConfigEntry,
    SchemaNatPolicyEntry,
    SchemaNetworkInterfaceEntry,
    SchemaPortForwardEntry,
    SchemaRouterIdRequest,
    SchemaRouterLanConfigResponse,
    SchemaRouterNetfilterConfigResponse,
    SchemaRouterOverviewResponse,
    SchemaWanLeaseReport,
    StatusCodes
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckServiceOrUserLogin} from '../../Application/Server/FlyingFishRouteCheckServiceOrUserLogin.js';
import {requirePermission} from '../../Application/Server/FlyingFishRouteCheckPermission.js';

/**
 * In-memory store of the live host NICs the netdevice part last reported (interface
 * discovery). Ephemeral — not persisted; repopulated on each netdevice reconcile so a
 * hot-plugged USB NIC appears in the management UI's select box within one interval.
 */
const availableInterfaces: {value: AvailableInterface[]} = {value: []};

/**
 * Derive the LAN's ULA gateway address (with /64) from its IPv4 address for NAT66 mode:
 * 192.168.50.1 → `fd00:50::1/64`. Uses the third octet as the ULA subnet id so the
 * mapping is readable and stable (192.168.<n>.x ↔ fd00:<n>::/64). Falls back to
 * `fd00::1/64` if the IPv4 can't be parsed. RFC 4193 wants a random global id; a fixed
 * fd00::-scheme is intentionally chosen here for a single home router (deterministic,
 * admin-recognisable) — the space is private and fully ours regardless.
 * @param ipv4 - the LAN interface's IPv4 address
 * @returns {string} the ULA gateway address in CIDR form
 */
function deriveLanUla(ipv4: string): string {
    const octets = ipv4.split('.');

    if (octets.length !== 4) {
        return 'fd00::1/64';
    }

    const subnet = Number(octets[2]);

    if (!Number.isInteger(subnet) || subnet < 0 || subnet > 255) {
        return 'fd00::1/64';
    }

    return `fd00:${subnet}::1/64`;
}

/**
 * Router — the Pi-router management API (Pi-router epic, Phase 1b): CRUD over this
 * node's network interfaces (WAN/LAN roles + IPv4 addressing), the NAT/routing policy
 * and the LAN DHCP server config (both singletons), plus a read-only view of active
 * leases. These are NODE-LOCAL resources; endpoints are gated by node-local RBAC
 * permissions (`router.read` to read; `network.write` / `nat.write` / `dhcp.write` to
 * mutate; the seeded superadmin `*` covers all).
 */
export class Router extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): ExpressRouter {
        this._get(
            '/json/router/overview',
            requirePermission('router.read'),
            async(): Promise<RouterOverviewResponse> => {
                const natPolicy = await NatPolicyServiceDB.getInstance().get();
                const dhcpConfigList = await DhcpServerConfigServiceDB.getInstance().findAllConfigs();
                const dhcpConfig = dhcpConfigList[0] ?? null;
                const wanLease = await WanLeaseServiceDB.getInstance().get();

                return {
                    statusCode: StatusCodes.OK,
                    interfaces: (await NetworkInterfaceServiceDB.getInstance().findAll()).map((entry) => ({
                        id: entry.id,
                        mac_address: entry.mac_address,
                        name: entry.name,
                        role: entry.role,
                        ipv4_mode: entry.ipv4_mode,
                        ipv4_address: entry.ipv4_address,
                        ipv4_prefix: entry.ipv4_prefix,
                        disable: entry.disable,
                        nat44_enabled: entry.nat44_enabled,
                        ipv6_mode: entry.ipv6_mode
                    })),
                    availableInterfaces: availableInterfaces.value,
                    natPolicy: natPolicy === null ? null : {
                        nat44_enabled: natPolicy.nat44_enabled,
                        ipv6_mode: natPolicy.ipv6_mode,
                        forward_enabled: natPolicy.forward_enabled
                    },
                    dhcpConfigs: dhcpConfigList.map((entry) => ({
                        network_interface_id: entry.network_interface_id,
                        enable: entry.enable,
                        range_start: entry.range_start,
                        range_end: entry.range_end,
                        lease_time: entry.lease_time,
                        gateway: entry.gateway,
                        dns_server: entry.dns_server,
                        domain: entry.domain,
                        ra_enable: entry.ra_enable
                    })),
                    dhcpConfig: dhcpConfig === null ? null : {
                        network_interface_id: dhcpConfig.network_interface_id,
                        enable: dhcpConfig.enable,
                        range_start: dhcpConfig.range_start,
                        range_end: dhcpConfig.range_end,
                        lease_time: dhcpConfig.lease_time,
                        gateway: dhcpConfig.gateway,
                        dns_server: dhcpConfig.dns_server,
                        domain: dhcpConfig.domain,
                        ra_enable: dhcpConfig.ra_enable
                    },
                    leases: (await DhcpLeaseServiceDB.getInstance().findAll()).map((entry) => ({
                        id: entry.id,
                        mac_address: entry.mac_address,
                        ip_address: entry.ip_address,
                        hostname: entry.hostname,
                        expires: entry.expires,
                        interface: entry.interface
                    })),
                    wanLease: wanLease === null ? null : {
                        interface: wanLease.interface,
                        ipv4_address: wanLease.ipv4_address,
                        ipv4_prefix: wanLease.ipv4_prefix,
                        gateway: wanLease.gateway,
                        dns_servers: wanLease.dns_servers,
                        ipv6_prefix: wanLease.ipv6_prefix,
                        lease_seconds: wanLease.lease_seconds,
                        obtained: wanLease.obtained
                    },
                    portForwards: (await PortForwardServiceDB.getInstance().findAllRules()).map((entry) => ({
                        id: entry.id,
                        proto: entry.proto,
                        wan_port: entry.wan_port,
                        wan_port_end: entry.wan_port_end,
                        family: entry.family,
                        target_type: entry.target_type,
                        target_host: entry.target_host,
                        target_port: entry.target_port,
                        enabled: entry.enabled,
                        description: entry.description
                    }))
                };
            },
            {
                description: 'Read the whole router config (interfaces, NAT policy, DHCP config, leases, port forwards)',
                responseBodySchema: SchemaRouterOverviewResponse
            }
        );

        this._post('/json/router/interface/save', requirePermission('network.write'), async(_req, _res, data): Promise<DefaultReturn> => {
            const body = data.body!;
            const entity = body.id === 0 ? new NetworkInterfaceDB() : await NetworkInterfaceServiceDB.getInstance().findOne(body.id) ?? new NetworkInterfaceDB();
            entity.mac_address = body.mac_address;
            entity.name = body.name ?? '';
            entity.role = body.role;
            entity.ipv4_mode = body.ipv4_mode;
            entity.ipv4_address = body.ipv4_address ?? '';
            entity.ipv4_prefix = body.ipv4_prefix ?? 0;
            entity.disable = body.disable ?? false;
            entity.nat44_enabled = body.nat44_enabled ?? false;
            entity.ipv6_mode = body.ipv6_mode ?? 'off';
            await NetworkInterfaceServiceDB.getInstance().save(entity);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Create/update a network interface', bodySchema: SchemaNetworkInterfaceEntry, responseBodySchema: SchemaDefaultReturn});

        this._post('/json/router/interface/delete', requirePermission('network.write'), async(_req, _res, data): Promise<DefaultReturn> => {
            await NetworkInterfaceServiceDB.getInstance().remove(data.body!.id);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Delete a network interface', bodySchema: SchemaRouterIdRequest, responseBodySchema: SchemaDefaultReturn});

        this._post('/json/router/nat/save', requirePermission('nat.write'), async(_req, _res, data): Promise<DefaultReturn> => {
            const body = data.body!;
            const entity = await NatPolicyServiceDB.getInstance().get() ?? new NatPolicyDB();
            entity.nat44_enabled = body.nat44_enabled;
            entity.ipv6_mode = body.ipv6_mode;
            entity.forward_enabled = body.forward_enabled;
            await NatPolicyServiceDB.getInstance().save(entity);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Set the NAT/routing policy', bodySchema: SchemaNatPolicyEntry, responseBodySchema: SchemaDefaultReturn});

        this._post('/json/router/dhcp/save', requirePermission('dhcp.write'), async(_req, _res, data): Promise<DefaultReturn> => {
            const body = data.body!;
            // Per-interface DHCP: resolve the target LAN interface (explicit, else the
            // first enabled lan-role interface as a fallback for older callers).
            const ifaceId = body.network_interface_id ??
                (await NetworkInterfaceServiceDB.getInstance().findByRole('lan')).filter((entry) => !entry.disable)[0]?.id ?? 0;
            const entity = await DhcpServerConfigServiceDB.getInstance().findByInterface(ifaceId) ?? new DhcpServerConfigDB();
            entity.network_interface_id = ifaceId;
            entity.enable = body.enable;
            entity.range_start = body.range_start ?? '';
            entity.range_end = body.range_end ?? '';
            entity.lease_time = body.lease_time ?? 3600;
            entity.gateway = body.gateway ?? '';
            entity.dns_server = body.dns_server ?? '';
            entity.domain = body.domain ?? '';
            entity.ra_enable = body.ra_enable ?? false;
            await DhcpServerConfigServiceDB.getInstance().save(entity);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Set the LAN DHCP server config', bodySchema: SchemaDhcpServerConfigEntry, responseBodySchema: SchemaDefaultReturn});

        // Port forwarding / inbound firewall rules (Phase 2). DNAT is NAT, so these mutations
        // reuse the `nat.write` permission (read is covered by the overview's `router.read`).
        this._post('/json/router/portforward/save', requirePermission('nat.write'), async(_req, _res, data): Promise<DefaultReturn> => {
            const body = data.body!;
            const entity = body.id === 0 ? new PortForwardDB() : await PortForwardServiceDB.getInstance().findOne(body.id) ?? new PortForwardDB();
            entity.proto = body.proto;
            entity.wan_port = body.wan_port;
            entity.wan_port_end = body.wan_port_end ?? 0;
            entity.family = body.family;
            entity.target_type = body.target_type;
            entity.target_host = body.target_host ?? '';
            entity.target_port = body.target_port ?? 0;
            entity.enabled = body.enabled;
            entity.description = body.description ?? '';
            await PortForwardServiceDB.getInstance().save(entity);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Create/update a port-forwarding / inbound firewall rule', bodySchema: SchemaPortForwardEntry, responseBodySchema: SchemaDefaultReturn});

        this._post('/json/router/portforward/delete', requirePermission('nat.write'), async(_req, _res, data): Promise<DefaultReturn> => {
            await PortForwardServiceDB.getInstance().remove(data.body!.id);

            return {statusCode: StatusCodes.OK};
        }, {description: 'Delete a port-forwarding / inbound firewall rule', bodySchema: SchemaRouterIdRequest, responseBodySchema: SchemaDefaultReturn});

        // Interface discovery: the netdevice part (host-net) reports the live host NICs
        // here on its reconcile loop, so the management UI can offer a NIC select box.
        // ServiceOrUserLogin: the part authenticates with the registry secret / mTLS.
        this._post('/json/router/available-interfaces', FlyingFishRouteCheckServiceOrUserLogin, async(_req, _res, data): Promise<DefaultReturn> => {
            availableInterfaces.value = data.body!.interfaces;

            return {statusCode: StatusCodes.OK};
        }, {description: 'netdevice reports the live host NICs (interface discovery)', bodySchema: SchemaAvailableInterfacesReport, responseBodySchema: SchemaDefaultReturn});

        // The resolved netfilter config the ff-netfilter part pulls (it builds + applies
        // the nftables ruleset from this). ServiceOrUserLogin: the part authenticates
        // with the registry secret / mTLS, same as the cluster local-state endpoints.
        this._get(
            '/json/router/netfilter-config',
            FlyingFishRouteCheckServiceOrUserLogin,
            async(): Promise<RouterNetfilterConfigResponse> => {
                const interfaces = await NetworkInterfaceServiceDB.getInstance().findAll();
                const policy = await NatPolicyServiceDB.getInstance().get();
                const forwards = await PortForwardServiceDB.getInstance().findAllRules();

                return {
                    statusCode: StatusCodes.OK,
                    config: resolveNftablesRouterConfig(
                        interfaces.map((entry) => ({
                            name: entry.name,
                            role: entry.role,
                            disable: entry.disable,
                            nat44_enabled: entry.nat44_enabled,
                            ipv6_mode: entry.ipv6_mode
                        })),
                        policy === null ? null : {forward_enabled: policy.forward_enabled},
                        forwards.map((entry) => ({
                            proto: entry.proto,
                            wan_port: entry.wan_port,
                            wan_port_end: entry.wan_port_end,
                            family: entry.family,
                            target_type: entry.target_type,
                            target_host: entry.target_host,
                            target_port: entry.target_port,
                            enabled: entry.enabled
                        }))
                    )
                };
            },
            {
                description: 'The resolved netfilter config (WAN/LAN + NAT/forward flags) for the ff-netfilter part',
                responseBodySchema: SchemaRouterNetfilterConfigResponse
            }
        );

        // The ff-wan part reports the DHCP lease it obtained on the WAN. ServiceOrUserLogin
        // (the part authenticates with the registry secret / mTLS). Singleton per node;
        // `obtained` is stamped server-side.
        this._post('/json/router/wan-lease', FlyingFishRouteCheckServiceOrUserLogin, async(_req, _res, data): Promise<DefaultReturn> => {
            const body = data.body!;
            const entity = await WanLeaseServiceDB.getInstance().get() ?? new WanLeaseDB();
            entity.interface = body.interface;
            entity.ipv4_address = body.ipv4_address ?? '';
            entity.ipv4_prefix = body.ipv4_prefix ?? 0;
            entity.gateway = body.gateway ?? '';
            entity.dns_servers = body.dns_servers ?? '';
            entity.ipv6_prefix = body.ipv6_prefix ?? '';
            entity.lease_seconds = body.lease_seconds ?? 0;
            entity.obtained = Math.floor(Date.now() / 1000);
            await WanLeaseServiceDB.getInstance().save(entity);

            return {statusCode: StatusCodes.OK};
        }, {description: 'ff-wan reports the WAN DHCP lease', bodySchema: SchemaWanLeaseReport, responseBodySchema: SchemaDefaultReturn});

        // The resolved LAN DHCP config the ff-lan part pulls (it builds the dnsmasq config
        // from this). ServiceOrUserLogin (registry secret / mTLS).
        this._get(
            '/json/router/lan-config',
            FlyingFishRouteCheckServiceOrUserLogin,
            async(): Promise<RouterLanConfigResponse> => {
                const lans = (await NetworkInterfaceServiceDB.getInstance().findByRole('lan')).filter((entry) => !entry.disable);
                const configs = [];

                // One config per enabled LAN interface (its own DHCP server + subnet);
                // the netdevice part runs one dnsmasq per entry.
                for (const lan of lans) {
                    const dhcp = await DhcpServerConfigServiceDB.getInstance().findByInterface(lan.id);
                    const ipv6Mode = lan.ipv6_mode ?? 'off';

                    configs.push({
                        lanInterface: lan.name,
                        address: lan.ipv4_address ?? '',
                        prefix: lan.ipv4_prefix ?? 24,
                        enable: dhcp?.enable ?? false,
                        rangeStart: dhcp?.range_start ?? '',
                        rangeEnd: dhcp?.range_end ?? '',
                        leaseSeconds: dhcp?.lease_time ?? 3600,
                        gateway: dhcp?.gateway ?? lan.ipv4_address,
                        dnsServer: dhcp?.dns_server ?? '',
                        domain: dhcp?.domain ?? '',
                        raEnable: dhcp?.ra_enable ?? false,
                        ipv6Mode: ipv6Mode,
                        // nat66 AND pd-server need a private ULA /64 on the LAN (nothing else
                        // assigns it) — for pd-server it is also the base for the delegation
                        // pool. Derived deterministically from the IPv4 subnet's third octet
                        // so 192.168.50.x ↔ fd00:50::/64 (readable + stable). pd/off carry none.
                        ipv6Ula: ipv6Mode === 'nat66' || ipv6Mode === 'pd-server'
                            ? deriveLanUla(lan.ipv4_address ?? '')
                            : ''
                    });
                }

                return {
                    statusCode: StatusCodes.OK,
                    configs: configs
                };
            },
            {
                description: 'The resolved LAN DHCP configs (one per enabled LAN interface) for the netdevice part',
                responseBodySchema: SchemaRouterLanConfigResponse
            }
        );

        // ff-lan reports the current dnsmasq leases (a bulk replace of the read model).
        // ServiceOrUserLogin (registry secret / mTLS).
        this._post('/json/router/dhcp-leases', FlyingFishRouteCheckServiceOrUserLogin, async(_req, _res, data): Promise<DefaultReturn> => {
            // Per-interface replace: only this LAN interface's leases (each netdevice
            // dnsmasq reports its own), so multiple LANs don't clobber each other.
            await DhcpLeaseServiceDB.getInstance().getRepository().delete({interface: data.body!.interface});

            for (const item of data.body!.leases) {
                const lease = new DhcpLeaseDB();
                lease.mac_address = item.mac_address;
                lease.ip_address = item.ip_address;
                lease.hostname = item.hostname;
                lease.expires = item.expires;
                lease.interface = item.interface;
                // eslint-disable-next-line no-await-in-loop -- small lease set, sequential insert is fine
                await DhcpLeaseServiceDB.getInstance().save(lease);
            }

            return {statusCode: StatusCodes.OK};
        }, {description: 'ff-lan reports the active LAN DHCP leases (bulk replace)', bodySchema: SchemaDhcpLeasesReport, responseBodySchema: SchemaDefaultReturn});

        return super.getExpressRouter();
    }

}