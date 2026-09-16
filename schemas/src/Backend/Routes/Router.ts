import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../Core/Server/Routes/DefaultReturn.js';

/**
 * Pi-router management DTOs (Pi-router epic, Phase 1b). Node-LOCAL config: network
 * interfaces + their WAN/LAN roles, the NAT/routing policy, and the LAN DHCP server
 * config, plus a read-only view of active leases. On an interface save, id 0 = create,
 * otherwise update. NatPolicy and DhcpServerConfig are singletons per node (save
 * upserts the single row). Endpoints are gated by node-local RBAC permissions
 * (`router.read`, `network.write`, `nat.write`, `dhcp.write`).
 */

/**
 * A physical network interface + its router role and IPv4 addressing.
 */
export const SchemaNetworkInterfaceEntry = Vts.object({
    id: Vts.number(),
    mac_address: Vts.string(),
    name: Vts.optional(Vts.string()),
    role: Vts.string(),
    ipv4_mode: Vts.string(),
    ipv4_address: Vts.optional(Vts.string()),
    ipv4_prefix: Vts.optional(Vts.number()),
    disable: Vts.optional(Vts.boolean())
});

/**
 * NetworkInterfaceEntry
 */
export type NetworkInterfaceEntry = ExtractSchemaResultType<typeof SchemaNetworkInterfaceEntry>;

/**
 * The node's NAT/routing policy (singleton).
 */
export const SchemaNatPolicyEntry = Vts.object({
    nat44_enabled: Vts.boolean(),
    ipv6_mode: Vts.string(),
    forward_enabled: Vts.boolean()
});

/**
 * NatPolicyEntry
 */
export type NatPolicyEntry = ExtractSchemaResultType<typeof SchemaNatPolicyEntry>;

/**
 * The LAN DHCP server config (singleton).
 */
export const SchemaDhcpServerConfigEntry = Vts.object({
    enable: Vts.boolean(),
    range_start: Vts.optional(Vts.string()),
    range_end: Vts.optional(Vts.string()),
    lease_time: Vts.optional(Vts.number()),
    gateway: Vts.optional(Vts.string()),
    dns_server: Vts.optional(Vts.string()),
    domain: Vts.optional(Vts.string()),
    ra_enable: Vts.optional(Vts.boolean())
});

/**
 * DhcpServerConfigEntry
 */
export type DhcpServerConfigEntry = ExtractSchemaResultType<typeof SchemaDhcpServerConfigEntry>;

/**
 * An active LAN DHCP lease (read-only).
 */
export const SchemaDhcpLeaseEntry = Vts.object({
    id: Vts.number(),
    mac_address: Vts.string(),
    ip_address: Vts.string(),
    hostname: Vts.string(),
    expires: Vts.number(),
    interface: Vts.string()
});

/**
 * DhcpLeaseEntry
 */
export type DhcpLeaseEntry = ExtractSchemaResultType<typeof SchemaDhcpLeaseEntry>;

/**
 * An int-id request (delete an interface).
 */
export const SchemaRouterIdRequest = Vts.object({
    id: Vts.number()
});

/**
 * RouterIdRequest
 */
export type RouterIdRequest = ExtractSchemaResultType<typeof SchemaRouterIdRequest>;

/**
 * The whole router config for the management UI. natPolicy/dhcpConfig are null until
 * first configured.
 */
export const SchemaRouterOverviewResponse = SchemaDefaultReturn.extend({
    interfaces: Vts.array(SchemaNetworkInterfaceEntry),
    natPolicy: Vts.or([SchemaNatPolicyEntry, Vts.null()]),
    dhcpConfig: Vts.or([SchemaDhcpServerConfigEntry, Vts.null()]),
    leases: Vts.array(SchemaDhcpLeaseEntry)
});

/**
 * RouterOverviewResponse
 */
export type RouterOverviewResponse = ExtractSchemaResultType<typeof SchemaRouterOverviewResponse>;

/**
 * The resolved netfilter config the `ff-netfilter` part pulls (Pi-router epic, Phase
 * 2b): the WAN/LAN interface names + NAT/forward flags, from which the part builds and
 * applies the nftables ruleset. `ipv6Mode` is one of `off` | `nat66` | `pd`.
 */
export const SchemaNftablesRouterConfig = Vts.object({
    wanInterface: Vts.string(),
    lanInterfaces: Vts.array(Vts.string()),
    nat44: Vts.boolean(),
    ipv6Mode: Vts.string(),
    forward: Vts.boolean()
});

/**
 * NftablesRouterConfigResponse — the resolved netfilter config for the part.
 */
export const SchemaRouterNetfilterConfigResponse = SchemaDefaultReturn.extend({
    config: SchemaNftablesRouterConfig
});

/**
 * RouterNetfilterConfigResponse
 */
export type RouterNetfilterConfigResponse = ExtractSchemaResultType<typeof SchemaRouterNetfilterConfigResponse>;