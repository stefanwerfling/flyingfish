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
    disable: Vts.optional(Vts.boolean()),
    // Per-LAN NAT (Pi-router UI v2): each LAN carries its own NAT44 + IPv6 mode
    // (off/nat66/pd). Optional so older callers stay valid.
    nat44_enabled: Vts.optional(Vts.boolean()),
    ipv6_mode: Vts.optional(Vts.string())
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
    network_interface_id: Vts.optional(Vts.number()),
    enable: Vts.boolean(),
    range_start: Vts.optional(Vts.string()),
    range_end: Vts.optional(Vts.string()),
    lease_time: Vts.optional(Vts.number()),
    gateway: Vts.optional(Vts.string()),
    dns_server: Vts.optional(Vts.string()),
    domain: Vts.optional(Vts.string()),
    ra_enable: Vts.optional(Vts.boolean()),
    // IPv6 RA timing (Pi-router NAT66 stability): max RA interval + advertised router
    // lifetime, in seconds. Frequent RAs + router-lifetime > address-lifetime keep a
    // downstream router's default route from expiring while its address persists.
    ra_interval: Vts.optional(Vts.number()),
    ra_router_lifetime: Vts.optional(Vts.number())
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
    ipv4: Vts.optional(Vts.string()),
    // The interface's current GLOBAL IPv6 address if any (WAN GUA / LAN ULA),
    // informational for the UI. Link-local (fe80::) is excluded.
    ipv6: Vts.optional(Vts.string()),
    // Cumulative rx/tx byte counters (sysfs); the UI derives a live in/out rate from the
    // delta between two polls.
    rxBytes: Vts.optional(Vts.number()),
    txBytes: Vts.optional(Vts.number()),
    // Cumulative link up/down transition count (sysfs carrier_changes); the UI derives a
    // flap rate from the delta between polls to warn about an unstable link (e.g. an
    // under-powered USB NIC).
    carrierChanges: Vts.optional(Vts.number())
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
 * A port-forwarding / inbound firewall rule (Pi-router Phase 2). `id` 0 = create on save.
 * `target_type` = `host` (DNAT to `target_host`:`target_port`) or `router` (open the WAN
 * port to a service on the Pi). `target_port` 0 = same as `wan_port`.
 */
export const SchemaPortForwardEntry = Vts.object({
    id: Vts.number(),
    proto: Vts.string(),
    wan_port: Vts.number(),
    wan_port_end: Vts.optional(Vts.number()),
    family: Vts.string(),
    target_type: Vts.string(),
    target_host: Vts.optional(Vts.string()),
    target_port: Vts.optional(Vts.number()),
    enabled: Vts.boolean(),
    description: Vts.optional(Vts.string())
});

/**
 * PortForwardEntry
 */
export type PortForwardEntry = ExtractSchemaResultType<typeof SchemaPortForwardEntry>;

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
    // One DHCP config per LAN interface (keyed by network_interface_id). dhcpConfig
    // (single) is kept for older callers; new UI groups by dhcpConfigs.
    dhcpConfigs: Vts.array(SchemaDhcpServerConfigEntry),
    dhcpConfig: Vts.or([SchemaDhcpServerConfigEntry, Vts.null()]),
    leases: Vts.array(SchemaDhcpLeaseEntry),
    wanLease: Vts.or([SchemaWanLeaseEntry, Vts.null()]),
    // Inbound firewall / port-forwarding rules (Phase 2). Optional so older callers stay valid.
    portForwards: Vts.optional(Vts.array(SchemaPortForwardEntry))
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
/**
 * One LAN interface + its own NAT settings in the resolved netfilter config (per-LAN NAT).
 */
export const SchemaNftablesLan = Vts.object({
    name: Vts.string(),
    nat44: Vts.boolean(),
    ipv6Mode: Vts.string()
});

/**
 * One resolved inbound rule in the netfilter config (Phase 2): a WAN port opened to a LAN
 * host (DNAT) or to the router itself. Concrete — proto/family are single values.
 */
export const SchemaNftablesForward = Vts.object({
    proto: Vts.string(),
    family: Vts.string(),
    wanPort: Vts.number(),
    wanPortEnd: Vts.number(),
    targetType: Vts.string(),
    host: Vts.string(),
    hostPort: Vts.number()
});

export const SchemaNftablesRouterConfig = Vts.object({
    wanInterface: Vts.string(),
    lans: Vts.array(SchemaNftablesLan),
    forward: Vts.boolean(),
    // Inbound firewall / port-forwarding rules (Phase 2). Optional so an older netdevice
    // build tolerates the field / a missing field defaults to none.
    forwards: Vts.optional(Vts.array(SchemaNftablesForward))
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
    // The interface's own static IPv4 address + prefix (the LAN gateway/subnet). The
    // netdevice part assigns this to the interface before starting dnsmasq — nothing else
    // sets the LAN address (WAN uses udhcpc; LAN is static).
    address: Vts.string(),
    prefix: Vts.number(),
    enable: Vts.boolean(),
    rangeStart: Vts.string(),
    rangeEnd: Vts.string(),
    leaseSeconds: Vts.number(),
    gateway: Vts.string(),
    dnsServer: Vts.string(),
    domain: Vts.string(),
    raEnable: Vts.boolean(),
    // IPv6 RA timing for dnsmasq `ra-param` (NAT66 stability): max RA interval + router
    // lifetime (s). 0 = dnsmasq default.
    raInterval: Vts.number(),
    raRouterLifetime: Vts.number(),
    // The LAN's IPv6 mode (off/nat66/pd) + the ULA the netdevice part must assign to the
    // interface in nat66 mode. In nat66 the LAN uses a private ULA /64 masqueraded to the
    // WAN GUA; nothing else assigns it, and dnsmasq's RA can only be sourced once the
    // interface also has a link-local — the part ensures both. Empty ula in pd/off mode
    // (pd routes the delegated prefix via `constructor:<lan>`).
    ipv6Mode: Vts.string(),
    ipv6Ula: Vts.string()
});

/**
 * SchemaRouterLanConfigResponse — the resolved LAN DHCP configs for the netdevice part:
 * ONE per enabled LAN interface (the part runs one dnsmasq per entry).
 */
export const SchemaRouterLanConfigResponse = SchemaDefaultReturn.extend({
    configs: Vts.array(SchemaRouterLanConfig)
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
    interface: Vts.string(),
    leases: Vts.array(SchemaDhcpLeaseReportItem)
});

/**
 * DhcpLeasesReport
 */
export type DhcpLeasesReport = ExtractSchemaResultType<typeof SchemaDhcpLeasesReport>;