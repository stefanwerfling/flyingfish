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
 * The WAN DHCP lease as shown in the overview (read-only).
 */
export const SchemaWanLeaseEntry = Vts.object({
    interface: Vts.string(),
    ipv4_address: Vts.string(),
    ipv4_prefix: Vts.number(),
    gateway: Vts.string(),
    dns_servers: Vts.string(),
    ipv6_prefix: Vts.string(),
    lease_seconds: Vts.number(),
    obtained: Vts.number()
});

/**
 * WanLeaseEntry
 */
export type WanLeaseEntry = ExtractSchemaResultType<typeof SchemaWanLeaseEntry>;

/**
 * The WAN lease report `ff-wan` posts after (re)obtaining the DHCP lease. `obtained` is
 * stamped server-side.
 */
export const SchemaWanLeaseReport = Vts.object({
    interface: Vts.string(),
    ipv4_address: Vts.optional(Vts.string()),
    ipv4_prefix: Vts.optional(Vts.number()),
    gateway: Vts.optional(Vts.string()),
    dns_servers: Vts.optional(Vts.string()),
    ipv6_prefix: Vts.optional(Vts.string()),
    lease_seconds: Vts.optional(Vts.number())
});

/**
 * WanLeaseReport
 */
export type WanLeaseReport = ExtractSchemaResultType<typeof SchemaWanLeaseReport>;

/**
 * A physical NIC as discovered live on the host by the netdevice part (host-net),
 * offered to the UI as a pick-list so the operator selects a NIC instead of typing
 * its MAC. `state` is the kernel operstate (up/down/…); `ipv4` is the current
 * address if any (informational).
 */
export const SchemaAvailableInterface = Vts.object({
    name: Vts.string(),
    mac: Vts.string(),
    state: Vts.string(),
    ipv4: Vts.optional(Vts.string())
});

/**
 * AvailableInterface
 */
export type AvailableInterface = ExtractSchemaResultType<typeof SchemaAvailableInterface>;

/**
 * The list of live host NICs the netdevice part reports on its reconcile loop, so the
 * management UI can show a select box (discovery — hot-plugged USB NICs appear here
 * within one reconcile interval).
 */
export const SchemaAvailableInterfacesReport = Vts.object({
    interfaces: Vts.array(SchemaAvailableInterface)
});

/**
 * AvailableInterfacesReport
 */
export type AvailableInterfacesReport = ExtractSchemaResultType<typeof SchemaAvailableInterfacesReport>;

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
    availableInterfaces: Vts.array(SchemaAvailableInterface),
    natPolicy: Vts.or([SchemaNatPolicyEntry, Vts.null()]),
    dhcpConfig: Vts.or([SchemaDhcpServerConfigEntry, Vts.null()]),
    leases: Vts.array(SchemaDhcpLeaseEntry),
    wanLease: Vts.or([SchemaWanLeaseEntry, Vts.null()])
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

/**
 * The resolved LAN DHCP config the `ff-lan` part pulls (Pi-router epic, Phase 4): the
 * LAN interface + the DhcpServerConfig fields, from which the part builds the dnsmasq
 * config. `lanInterface` is the first enabled `lan`-role interface (empty if none).
 */
export const SchemaRouterLanConfig = Vts.object({
    lanInterface: Vts.string(),
    enable: Vts.boolean(),
    rangeStart: Vts.string(),
    rangeEnd: Vts.string(),
    leaseSeconds: Vts.number(),
    gateway: Vts.string(),
    dnsServer: Vts.string(),
    domain: Vts.string(),
    raEnable: Vts.boolean()
});

/**
 * SchemaRouterLanConfigResponse — the resolved LAN DHCP config for the ff-lan part.
 */
export const SchemaRouterLanConfigResponse = SchemaDefaultReturn.extend({
    config: SchemaRouterLanConfig
});

/**
 * RouterLanConfigResponse
 */
export type RouterLanConfigResponse = ExtractSchemaResultType<typeof SchemaRouterLanConfigResponse>;

/**
 * One active LAN DHCP lease ff-lan reports.
 */
export const SchemaDhcpLeaseReportItem = Vts.object({
    mac_address: Vts.string(),
    ip_address: Vts.string(),
    hostname: Vts.string(),
    expires: Vts.number(),
    interface: Vts.string()
});

/**
 * The LAN DHCP lease report `ff-lan` posts (the full current lease set — a bulk replace).
 */
export const SchemaDhcpLeasesReport = Vts.object({
    leases: Vts.array(SchemaDhcpLeaseReportItem)
});

/**
 * DhcpLeasesReport
 */
export type DhcpLeasesReport = ExtractSchemaResultType<typeof SchemaDhcpLeasesReport>;