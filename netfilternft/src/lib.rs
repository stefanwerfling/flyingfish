//! FlyingFish netfilter router — native nftables binding (Pi-router epic, Phase 2).
//!
//! Programs the host's nftables ruleset over netlink (via `rustables`, no `nft` binary)
//! and sets the forwarding sysctls, from the resolved router config. Exposes a single
//! napi entry point `applyRouter(...)` the netfilter part calls each reconcile.
//!
//! It owns three tables (`flyingfish-filter`, `flyingfish-nat4`, `flyingfish-nat6`) and
//! replaces them atomically in one netlink batch each apply (delete the ones that exist
//! + add the desired set), so a reconcile deterministically converges to the config
//! without touching foreign tables.

use futures::TryStreamExt;
use napi_derive::napi;
use rustables::expr::{
    Bitwise, Cmp, CmpOp, ConnTrackState, Conntrack, ConntrackKey, HighLevelPayload, Immediate, Nat,
    NatType, Register, TCPHeaderField, TransportHeaderField, UDPHeaderField,
};
use rustables::{
    Batch, Chain, ChainPolicy, ChainType, Hook, HookClass, MsgType, Protocol, ProtocolFamily, Rule,
    Table, list_tables,
};
use std::error::Error;
use std::net::{IpAddr, Ipv6Addr};

const FILTER_TABLE: &str = "flyingfish-filter";
const NAT4_TABLE: &str = "flyingfish-nat4";
const NAT6_TABLE: &str = "flyingfish-nat6";

/// The NAT postrouting chain priority (srcnat), matching `nft`'s `priority 100`.
const NAT_PRIORITY: i32 = 100;

/// The NAT prerouting chain priority (dstnat), matching `nft`'s `priority -100`.
const NAT_DNAT_PRIORITY: i32 = -100;

/// Map the JS proto string to a rustables `Protocol` (defaults to TCP).
fn parse_proto(proto: &str) -> Protocol {
    if proto == "udp" {
        Protocol::UDP
    } else {
        Protocol::TCP
    }
}

/// The destination port a host forward DNATs to: the explicit target port, or the WAN
/// port when it is 0 (the documented "0 = same as the WAN port" default).
fn forward_host_port(fwd: &PortForward) -> u16 {
    if fwd.host_port > 0 {
        fwd.host_port as u16
    } else {
        fwd.wan_port as u16
    }
}

/// Whether the forward covers a WAN port RANGE (`wan_port_end` above `wan_port`).
fn is_range(fwd: &PortForward) -> bool {
    fwd.wan_port_end > fwd.wan_port
}

/// Match a destination port, single (`dport N`) or a range (`dport start-end`). `rustables`
/// `Rule::dport` only matches a single port, so a range is built from the raw transport
/// dport payload compared `>= start` and `<= end` (like `nft`'s `dport start-end`).
fn with_dport(rule: Rule, proto: Protocol, start: u16, end: u16) -> Rule {
    if end > start {
        let mut rule = rule.protocol(proto);
        let field = match proto {
            Protocol::TCP => TransportHeaderField::Tcp(TCPHeaderField::Dport),
            Protocol::UDP => TransportHeaderField::Udp(UDPHeaderField::Dport),
        };
        rule.add_expr(HighLevelPayload::Transport(field).build());
        rule.add_expr(Cmp::new(CmpOp::Gte, start.to_be_bytes()));
        rule.add_expr(HighLevelPayload::Transport(field).build());
        rule.add_expr(Cmp::new(CmpOp::Lte, end.to_be_bytes()));
        rule
    } else {
        rule.dport(start, proto)
    }
}

/// Append a scoped `iifname <wan> ct state established,related accept` rule to `chain`.
/// Scoping to the WAN ingress means it only accepts RETURN traffic of flows the LAN (or
/// the router) initiated — LAN→WAN itself is untouched, so "routing off" stays a hard
/// stop. `rustables` has no high-level established-OR-related helper (`Rule::established`
/// is established-only), so the conntrack-state match is built from raw expressions.
fn accept_wan_established_related(
    chain: &Chain,
    wan: &str,
    batch: &mut Batch,
) -> Result<(), Box<dyn Error>> {
    let states = (ConnTrackState::ESTABLISHED | ConnTrackState::RELATED).bits();
    let mut rule = Rule::new(chain)?.iiface(wan)?;
    rule.add_expr(Conntrack::new(ConntrackKey::State));
    rule.add_expr(Bitwise::new(states.to_le_bytes(), 0u32.to_be_bytes())?);
    rule.add_expr(Cmp::new(CmpOp::Neq, 0u32.to_be_bytes()));
    rule.accept().add_to_batch(batch);

    Ok(())
}

/// Write a sysctl value under /proc/sys (path uses `/` separators, e.g.
/// `net/ipv4/ip_forward`).
fn set_sysctl(path_suffix: &str, value: &str) -> std::io::Result<()> {
    std::fs::write(format!("/proc/sys/{}", path_suffix), value)
}

/// One LAN interface + its own NAT settings (Pi-router UI v2 — NAT is per LAN).
#[napi(object)]
pub struct LanNat {
    pub name: String,
    pub nat44: bool,
    /// `off` | `nat66` (masquerade) | `pd` (route, no NAT). JS name: `ipv6Mode`.
    pub ipv6_mode: String,
}

/// One resolved inbound rule (port forwarding / firewall pinhole, Pi-router Phase 2).
/// A `router`-target rule opens the WAN port to a service on the router itself (a
/// dual-stack input-chain accept); a `host`-target rule DNATs the WAN port to a LAN
/// host of the given `family` (prerouting DNAT in the family's NAT table).
#[napi(object)]
pub struct PortForward {
    /// `tcp` | `udp` (a `both` rule is expanded to two entries upstream).
    pub proto: String,
    /// `ipv4` | `ipv6` — only meaningful for a `host` target (picks the NAT table);
    /// ignored for a `router` target, which is always dual-stack.
    pub family: String,
    /// The WAN-side port that is opened / forwarded (the range start when `wan_port_end`
    /// is set).
    pub wan_port: u32,
    /// End of the WAN port range (inclusive); 0 = a single port. A range is forwarded 1:1
    /// (each WAN port maps to the same port on the host), so `host_port` is ignored.
    pub wan_port_end: u32,
    /// `host` (DNAT to `host`:`host_port`) | `router` (accept to the router itself).
    pub target_type: String,
    /// The LAN host IP a `host` target forwards to (empty for a `router` target).
    pub host: String,
    /// The port on `host` a `host` target forwards to (0 for a `router` target).
    pub host_port: u32,
}

/// Add a NAT table (family-specific) with:
/// - a postrouting chain that masquerades each of the given LAN interfaces → WAN (one
///   scoped `iiface <lan> oiface <wan> masquerade` rule per LAN, so each LAN's NAT is
///   independent), and
/// - a prerouting chain (only when there are DNAT forwards) that redirects each
///   `iiface <wan> <proto> dport <wanPort>` to `<host>:<hostPort>` — port forwarding.
///
/// The DNAT is built from raw expressions (the destination address in register 1, the
/// destination port in register 2, then a `Nat`/DNat statement consuming both), since
/// `rustables` has no high-level DNAT helper. Injection-free by construction: every value
/// is a typed IP/port, never a shell string.
fn add_nat_table(
    batch: &mut Batch,
    name: &str,
    family: ProtocolFamily,
    wan: &str,
    masq_lans: &[&str],
    dnat_forwards: &[&PortForward],
) -> Result<(), Box<dyn Error>> {
    let table = Table::new(family).with_name(name);
    batch.add(&table, MsgType::Add);

    let postrouting = Chain::new(&table)
        .with_name("postrouting")
        .with_type(ChainType::Nat)
        .with_hook(Hook::new(HookClass::PostRouting, NAT_PRIORITY))
        .with_policy(ChainPolicy::Accept)
        .add_to_batch(batch);

    for lan in masq_lans {
        Rule::new(&postrouting)?
            .iiface(lan)?
            .oiface(wan)?
            .masquerade()
            .add_to_batch(batch);
    }

    if !dnat_forwards.is_empty() {
        let prerouting = Chain::new(&table)
            .with_name("prerouting")
            .with_type(ChainType::Nat)
            .with_hook(Hook::new(HookClass::PreRouting, NAT_DNAT_PRIORITY))
            .with_policy(ChainPolicy::Accept)
            .add_to_batch(batch);

        for fwd in dnat_forwards {
            let host: IpAddr = fwd
                .host
                .parse()
                .map_err(|_| format!("invalid forward host: {}", fwd.host))?;
            let ip_bytes = match host {
                IpAddr::V4(addr) => addr.octets().to_vec(),
                IpAddr::V6(addr) => addr.octets().to_vec(),
            };
            let range = is_range(fwd);

            let mut rule = with_dport(
                Rule::new(&prerouting)?.iiface(wan)?,
                parse_proto(&fwd.proto),
                fwd.wan_port as u16,
                fwd.wan_port_end as u16,
            );

            // Destination address into register 1 (always). For a single port, the target
            // port goes into register 2 and the NAT rewrites both. For a RANGE, the DNAT is
            // portless (`dnat to <host>`) so the kernel preserves each port 1:1.
            rule.add_expr(Immediate::new_data(ip_bytes, Register::Reg1));

            let mut nat = Nat::default()
                .with_nat_type(NatType::DNat)
                .with_family(family)
                .with_ip_register(Register::Reg1);

            if !range {
                rule.add_expr(Immediate::new_data(
                    forward_host_port(fwd).to_be_bytes().to_vec(),
                    Register::Reg2,
                ));
                nat = nat.with_port_register(Register::Reg2);
            }

            rule.add_expr(nat);
            rule.add_to_batch(batch);
        }
    }

    Ok(())
}

/// Build + send the whole nftables ruleset for the given router config.
fn apply_nftables(
    wan: &str,
    lans: &[LanNat],
    forward: bool,
    forwards: &[PortForward],
) -> Result<(), Box<dyn Error>> {
    let mut batch = Batch::new();

    // Idempotent replace: delete only the FlyingFish tables that currently exist, in the
    // same batch as the re-adds (atomic), so foreign tables are untouched.
    let ours = [FILTER_TABLE, NAT4_TABLE, NAT6_TABLE];
    for table in list_tables()? {
        if let Some(name) = table.get_name() {
            if ours.contains(&name.as_str()) {
                batch.add(&table, MsgType::Del);
            }
        }
    }

    let has_wan = !wan.is_empty();

    // Forward filter (inet = IPv4 + IPv6). The chain uses an ACCEPT policy on purpose:
    // a global DROP policy on the forward hook also catches Docker's bridge forwarding
    // (published-port return path) and any foreign routing, which would break the whole
    // stack — the same reason apply_router never writes ip_forward=0. So `forward_enabled`
    // is expressed by SCOPING, not a blanket drop: when routing is DISABLED we install
    // explicit `iifname <lan> oifname <wan> drop` rules that block LAN→WAN routing while
    // leaving Docker/foreign traffic untouched; when routing is ENABLED the chain is a
    // no-op (accept policy) and LAN↔WAN flows. This keeps the flag honest — the map/UI
    // "forwarding on/off" now matches what actually happens on the wire.
    {
        let table = Table::new(ProtocolFamily::Inet).with_name(FILTER_TABLE);
        batch.add(&table, MsgType::Add);

        let forward_chain = Chain::new(&table)
            .with_name("forward")
            .with_hook(Hook::new(HookClass::Forward, 0))
            .with_policy(ChainPolicy::Accept)
            .add_to_batch(&mut batch);

        // WAN→LAN inbound firewall (stateful). The forward hook keeps an ACCEPT policy (a
        // blanket forward DROP also kills Docker's published-port forwarding and any foreign
        // routing), so the firewall is expressed by SCOPING to the WAN ingress + LAN egress:
        //   1. accept return traffic of LAN/router-initiated flows (established/related),
        //   2. accept the explicitly forwarded ports (matched by their post-DNAT dest host),
        //   3. drop the rest of new WAN→LAN — so LAN hosts (esp. globally-routable IPv6 in
        //      pd mode) are NOT exposed to unsolicited inbound.
        // The drop is scoped `iifname <wan> oifname <lan>` per LAN, so Docker's bridge
        // forwarding (oif = a docker bridge, not a LAN) is untouched.
        if has_wan {
            accept_wan_established_related(&forward_chain, wan, &mut batch)?;

            for fwd in forwards {
                if fwd.target_type != "host" {
                    continue;
                }

                let host: IpAddr = fwd
                    .host
                    .parse()
                    .map_err(|_| format!("invalid forward host: {}", fwd.host))?;
                let proto = parse_proto(&fwd.proto);

                // After the prerouting DNAT the forwarded packet's dport is: the original WAN
                // range (a range DNATs 1:1, dport preserved) or the single rewritten host
                // port. Match accordingly, scoped to the DNAT destination host.
                let rule = Rule::new(&forward_chain)?.iiface(wan)?.daddr(host);
                let rule = if is_range(fwd) {
                    with_dport(rule, proto, fwd.wan_port as u16, fwd.wan_port_end as u16)
                } else {
                    rule.dport(forward_host_port(fwd), proto)
                };
                rule.accept().add_to_batch(&mut batch);
            }

            for lan in lans {
                Rule::new(&forward_chain)?
                    .iiface(wan)?
                    .oiface(&lan.name)?
                    .drop()
                    .add_to_batch(&mut batch);
            }
        }

        // Routing OFF: additionally block new LAN→WAN (the other direction), leaving
        // Docker/foreign forwarding untouched.
        if !forward && has_wan {
            for lan in lans {
                Rule::new(&forward_chain)?
                    .iiface(&lan.name)?
                    .oiface(wan)?
                    .drop()
                    .add_to_batch(&mut batch);
            }
        }

        // Input firewall: protect the ROUTER's OWN services (SSH, web UI, nginx, PKI, …)
        // from the WAN. ACCEPT policy on purpose — never lock out LAN/management: the chain
        // only DROPS unsolicited TCP+UDP inbound on the WAN interface, after accepting
        // established/related, loopback and the WAN's own DHCP-client reply ports. ICMPv6
        // (NDP / router advertisement / packet-too-big) is deliberately NOT matched, so it
        // stays accepted by the policy and IPv6/WAN keep working. LAN traffic never hits the
        // WAN-scoped drops, so it is accepted too. (Per-port inbound openings / port
        // forwarding land here in Phase 2.)
        let input_chain = Chain::new(&table)
            .with_name("input")
            .with_hook(Hook::new(HookClass::In, 0))
            .with_policy(ChainPolicy::Accept)
            .add_to_batch(&mut batch);

        Rule::new(&input_chain)?.established()?.accept().add_to_batch(&mut batch);
        Rule::new(&input_chain)?.iiface("lo")?.accept().add_to_batch(&mut batch);

        if has_wan {
            // Keep the WAN's own DHCP client working (DHCPv4 reply → udp/68, DHCPv6 → udp/546).
            Rule::new(&input_chain)?.iiface(wan)?.dport(68, Protocol::UDP).accept().add_to_batch(&mut batch);
            Rule::new(&input_chain)?.iiface(wan)?.dport(546, Protocol::UDP).accept().add_to_batch(&mut batch);
            // Port-forward pinholes to the router's OWN services: accept the configured WAN
            // ports (dual-stack — the family is irrelevant for a router target) BEFORE the
            // blanket drops below, so they punch through the closed WAN firewall.
            for fwd in forwards {
                if fwd.target_type == "router" {
                    let rule = with_dport(
                        Rule::new(&input_chain)?.iiface(wan)?,
                        parse_proto(&fwd.proto),
                        fwd.wan_port as u16,
                        fwd.wan_port_end as u16,
                    );
                    rule.accept().add_to_batch(&mut batch);
                }
            }
            // Drop unsolicited TCP + UDP inbound on the WAN (services closed to the internet);
            // ICMPv6 is left to the accept policy so NDP/RA/PMTUD survive.
            Rule::new(&input_chain)?.iiface(wan)?.protocol(Protocol::TCP).drop().add_to_batch(&mut batch);
            Rule::new(&input_chain)?.iiface(wan)?.protocol(Protocol::UDP).drop().add_to_batch(&mut batch);
        }
    }

    // NAT44: masquerade each LAN that has nat44 on → WAN, plus DNAT any IPv4 host
    // forwards. The table is created when either is present.
    let nat4_masq: Vec<&str> = lans.iter().filter(|lan| lan.nat44).map(|lan| lan.name.as_str()).collect();
    let nat4_dnat: Vec<&PortForward> = forwards
        .iter()
        .filter(|fwd| fwd.target_type == "host" && fwd.family == "ipv4")
        .collect();
    if has_wan && (!nat4_masq.is_empty() || !nat4_dnat.is_empty()) {
        add_nat_table(&mut batch, NAT4_TABLE, ProtocolFamily::Ipv4, wan, &nat4_masq, &nat4_dnat)?;
    }

    // NAT66: masquerade each LAN in nat66 OR pd-server mode → WAN (both hand out ULA,
    // which needs NAT to reach the internet; `pd` routes an upstream GUA, `off` neither),
    // plus DNAT any IPv6 host forwards.
    let nat6_masq: Vec<&str> = lans
        .iter()
        .filter(|lan| lan.ipv6_mode == "nat66" || lan.ipv6_mode == "pd-server")
        .map(|lan| lan.name.as_str())
        .collect();
    let nat6_dnat: Vec<&PortForward> = forwards
        .iter()
        .filter(|fwd| fwd.target_type == "host" && fwd.family == "ipv6")
        .collect();
    if has_wan && (!nat6_masq.is_empty() || !nat6_dnat.is_empty()) {
        add_nat_table(&mut batch, NAT6_TABLE, ProtocolFamily::Ipv6, wan, &nat6_masq, &nat6_dnat)?;
    }

    batch.send()?;

    Ok(())
}

/// Apply the router's nftables ruleset + forwarding sysctls to the host (Pi-router
/// epic, Phase 2). Requires CAP_NET_ADMIN + the host network namespace.
///
/// - `wanInterface` — the WAN (uplink) interface name; empty disables all NAT.
/// - `lans` — the LAN interfaces, each with its own `nat44` + `ipv6Mode`.
/// - `forward` — enable routing (forward chain + IP forwarding sysctls).
/// - `forwards` — inbound rules: router-target pinholes (input accept) and host-target
///   port forwards (prerouting DNAT). Empty leaves the WAN firewall fully closed.
#[napi]
pub fn apply_router(
    wan_interface: String,
    lans: Vec<LanNat>,
    forward: bool,
    forwards: Vec<PortForward>,
) -> napi::Result<()> {
    // Only ENSURE forwarding is on when routing; never write "0". Disabling
    // ip_forward would break Docker's published-port return path (the whole stack
    // becomes unreachable from the network) — and a router/OS image ships it on
    // anyway. Best-effort: /proc/sys is read-only in a non-privileged container, so
    // a failed write must NOT abort the nftables apply (forwarding stays as baked).
    if forward {
        let _ = set_sysctl("net/ipv4/ip_forward", "1");

        if lans.iter().any(|lan| lan.ipv6_mode != "off") {
            let _ = set_sysctl("net/ipv6/conf/all/forwarding", "1");
        }
    }

    apply_nftables(&wan_interface, &lans, forward, &forwards)
        .map_err(|error| napi::Error::from_reason(error.to_string()))
}

// ---------------------------------------------------------------------------------------
// IPv6 route management (Pi-router epic — ULA-PD server). Native rtnetlink binding so the
// netdevice part installs routes to delegated PD prefixes over netlink, not by shelling out
// to `ip` — consistent with the nftables binding above and injection-free by construction
// (typed args, no shell). Routes are infrequent (per PD lease event), so each call spins a
// small current-thread runtime.
// ---------------------------------------------------------------------------------------

/// Run a route future to completion on a throwaway current-thread runtime.
fn run_route<F>(fut: F) -> napi::Result<()>
where
    F: std::future::Future<Output = Result<(), Box<dyn Error>>>,
{
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|error| napi::Error::from_reason(error.to_string()))?;

    runtime
        .block_on(fut)
        .map_err(|error| napi::Error::from_reason(error.to_string()))
}

/// Resolve an interface name to its kernel index over rtnetlink.
async fn if_index(handle: &rtnetlink::Handle, dev: &str) -> Result<u32, Box<dyn Error>> {
    let mut links = handle.link().get().match_name(dev.to_string()).execute();

    match links.try_next().await? {
        Some(link) => Ok(link.header.index),
        None => Err(format!("interface not found: {dev}").into()),
    }
}

/// Replace (add-or-update) an IPv6 route `dest/prefix_len via <via> dev <dev>`.
async fn route6_replace(
    dest: Ipv6Addr,
    prefix_len: u8,
    via: Ipv6Addr,
    dev: &str,
) -> Result<(), Box<dyn Error>> {
    let (connection, handle, _) = rtnetlink::new_connection()?;
    tokio::spawn(connection);

    let index = if_index(&handle, dev).await?;

    handle
        .route()
        .add()
        .v6()
        .destination_prefix(dest, prefix_len)
        .gateway(via)
        .output_interface(index)
        .replace()
        .execute()
        .await?;

    Ok(())
}

/// Delete an IPv6 route `dest/prefix_len dev <dev>`.
async fn route6_del(dest: Ipv6Addr, prefix_len: u8, dev: &str) -> Result<(), Box<dyn Error>> {
    let (connection, handle, _) = rtnetlink::new_connection()?;
    tokio::spawn(connection);

    let index = if_index(&handle, dev).await?;

    // Build the matching route message via the add-builder, then delete it.
    let message = handle
        .route()
        .add()
        .v6()
        .destination_prefix(dest, prefix_len)
        .output_interface(index)
        .message_mut()
        .clone();

    handle.route().del(message).execute().await?;

    Ok(())
}

/// Install (replace) a route to a delegated IPv6 prefix via the requesting router's
/// link-local next-hop. Requires CAP_NET_ADMIN + the host network namespace.
///
/// - `dest` — the delegated prefix network address (e.g. `fd00:50:1:a00::`).
/// - `prefix_len` — the delegated prefix length (e.g. 60).
/// - `via` — the next-hop (the downstream router's link-local, e.g. `fe80::...`).
/// - `dev` — the LAN interface the downstream router is on.
#[napi]
pub fn route_replace_v6(dest: String, prefix_len: u8, via: String, dev: String) -> napi::Result<()> {
    let destination: Ipv6Addr = dest
        .parse()
        .map_err(|_| napi::Error::from_reason(format!("invalid dest: {dest}")))?;
    let gateway: Ipv6Addr = via
        .parse()
        .map_err(|_| napi::Error::from_reason(format!("invalid via: {via}")))?;

    run_route(route6_replace(destination, prefix_len, gateway, &dev))
}

/// Delete a previously installed delegated-prefix route.
///
/// - `dest` — the delegated prefix network address.
/// - `prefix_len` — the delegated prefix length.
/// - `dev` — the LAN interface.
#[napi]
pub fn route_del_v6(dest: String, prefix_len: u8, dev: String) -> napi::Result<()> {
    let destination: Ipv6Addr = dest
        .parse()
        .map_err(|_| napi::Error::from_reason(format!("invalid dest: {dest}")))?;

    run_route(route6_del(destination, prefix_len, &dev))
}
