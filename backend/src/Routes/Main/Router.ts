import {Router as ExpressRouter} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {
    DhcpServerConfigDB,
    DhcpServerConfigServiceDB,
    DhcpLeaseServiceDB,
    NatPolicyDB,
    NatPolicyServiceDB,
    NetworkInterfaceDB,
    NetworkInterfaceServiceDB,
    resolveNftablesRouterConfig
} from 'flyingfish_core';
import {
    DefaultReturn,
    RouterNetfilterConfigResponse,
    RouterOverviewResponse,
    SchemaDefaultReturn,
    SchemaDhcpServerConfigEntry,
    SchemaNatPolicyEntry,
    SchemaNetworkInterfaceEntry,
    SchemaRouterIdRequest,
    SchemaRouterNetfilterConfigResponse,
    SchemaRouterOverviewResponse,
    StatusCodes
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckServiceOrUserLogin} from '../../Application/Server/FlyingFishRouteCheckServiceOrUserLogin.js';
import {requirePermission} from '../../Application/Server/FlyingFishRouteCheckPermission.js';

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
                const dhcpConfig = await DhcpServerConfigServiceDB.getInstance().get();

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
                        disable: entry.disable
                    })),
                    natPolicy: natPolicy === null ? null : {
                        nat44_enabled: natPolicy.nat44_enabled,
                        ipv6_mode: natPolicy.ipv6_mode,
                        forward_enabled: natPolicy.forward_enabled
                    },
                    dhcpConfig: dhcpConfig === null ? null : {
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
                    }))
                };
            },
            {
                description: 'Read the whole router config (interfaces, NAT policy, DHCP config, leases)',
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
            const entity = await DhcpServerConfigServiceDB.getInstance().get() ?? new DhcpServerConfigDB();
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

        // The resolved netfilter config the ff-netfilter part pulls (it builds + applies
        // the nftables ruleset from this). ServiceOrUserLogin: the part authenticates
        // with the registry secret / mTLS, same as the cluster local-state endpoints.
        this._get(
            '/json/router/netfilter-config',
            FlyingFishRouteCheckServiceOrUserLogin,
            async(): Promise<RouterNetfilterConfigResponse> => {
                const interfaces = await NetworkInterfaceServiceDB.getInstance().findAll();
                const policy = await NatPolicyServiceDB.getInstance().get();

                return {
                    statusCode: StatusCodes.OK,
                    config: resolveNftablesRouterConfig(
                        interfaces.map((entry) => ({name: entry.name, role: entry.role, disable: entry.disable})),
                        policy === null ? null : {
                            nat44_enabled: policy.nat44_enabled,
                            ipv6_mode: policy.ipv6_mode,
                            forward_enabled: policy.forward_enabled
                        }
                    )
                };
            },
            {
                description: 'The resolved netfilter config (WAN/LAN + NAT/forward flags) for the ff-netfilter part',
                responseBodySchema: SchemaRouterNetfilterConfigResponse
            }
        );

        return super.getExpressRouter();
    }

}