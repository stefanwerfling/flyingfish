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

use napi_derive::napi;
use rustables::{
    Batch, Chain, ChainPolicy, ChainType, Hook, HookClass, MsgType, ProtocolFamily, Rule, Table,
    list_tables,
};
use std::error::Error;

const FILTER_TABLE: &str = "flyingfish-filter";
const NAT4_TABLE: &str = "flyingfish-nat4";
const NAT6_TABLE: &str = "flyingfish-nat6";

/// The NAT postrouting chain priority (srcnat), matching `nft`'s `priority 100`.
const NAT_PRIORITY: i32 = 100;

/// Write a sysctl value under /proc/sys (path uses `/` separators, e.g.
/// `net/ipv4/ip_forward`).
fn set_sysctl(path_suffix: &str, value: &str) -> std::io::Result<()> {
    std::fs::write(format!("/proc/sys/{}", path_suffix), value)
}

/// Add a NAT table (family-specific) with a postrouting masquerade chain on the WAN.
fn add_nat_table(
    batch: &mut Batch,
    name: &str,
    family: ProtocolFamily,
    wan: &str,
) -> Result<(), Box<dyn Error>> {
    let table = Table::new(family).with_name(name);
    batch.add(&table, MsgType::Add);

    let postrouting = Chain::new(&table)
        .with_name("postrouting")
        .with_type(ChainType::Nat)
        .with_hook(Hook::new(HookClass::PostRouting, NAT_PRIORITY))
        .with_policy(ChainPolicy::Accept)
        .add_to_batch(batch);

    Rule::new(&postrouting)?
        .oiface(wan)?
        .masquerade()
        .add_to_batch(batch);

    Ok(())
}

/// Build + send the whole nftables ruleset for the given router config.
fn apply_nftables(
    wan: &str,
    lans: &[String],
    nat44: bool,
    ipv6_mode: &str,
    forward: bool,
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

    // Forward filter (inet = IPv4 + IPv6): default DROP, established/related + LAN→WAN.
    if forward {
        let table = Table::new(ProtocolFamily::Inet).with_name(FILTER_TABLE);
        batch.add(&table, MsgType::Add);

        let forward_chain = Chain::new(&table)
            .with_name("forward")
            .with_hook(Hook::new(HookClass::Forward, 0))
            .with_policy(ChainPolicy::Drop)
            .add_to_batch(&mut batch);

        Rule::new(&forward_chain)?
            .established()?
            .accept()
            .add_to_batch(&mut batch);

        if has_wan {
            for lan in lans {
                Rule::new(&forward_chain)?
                    .iiface(lan)?
                    .oiface(wan)?
                    .accept()
                    .add_to_batch(&mut batch);
            }
        }
    }

    // NAT44: masquerade IPv4 LAN → WAN.
    if has_wan && nat44 {
        add_nat_table(&mut batch, NAT4_TABLE, ProtocolFamily::Ipv4, wan)?;
    }

    // NAT66: masquerade IPv6 LAN → WAN (only in nat66 mode; `pd` routes, `off` neither).
    if has_wan && ipv6_mode == "nat66" {
        add_nat_table(&mut batch, NAT6_TABLE, ProtocolFamily::Ipv6, wan)?;
    }

    batch.send()?;

    Ok(())
}

/// Apply the router's nftables ruleset + forwarding sysctls to the host (Pi-router
/// epic, Phase 2). Requires CAP_NET_ADMIN + the host network namespace.
///
/// - `wanInterface` — the WAN (uplink) interface name; empty disables all NAT.
/// - `lanInterfaces` — the LAN (downlink) interface names.
/// - `nat44` — masquerade IPv4 LAN → WAN.
/// - `ipv6Mode` — `off` | `nat66` (masquerade) | `pd` (route, no NAT).
/// - `forward` — enable routing (forward chain + IP forwarding sysctls).
#[napi]
pub fn apply_router(
    wan_interface: String,
    lan_interfaces: Vec<String>,
    nat44: bool,
    ipv6_mode: String,
    forward: bool,
) -> napi::Result<()> {
    set_sysctl("net/ipv4/ip_forward", if forward { "1" } else { "0" })
        .map_err(|error| napi::Error::from_reason(error.to_string()))?;

    // IPv6 forwarding may be absent on an IPv6-disabled kernel; ignore that write error.
    let ipv6_forward = forward && ipv6_mode != "off";
    let _ = set_sysctl(
        "net/ipv6/conf/all/forwarding",
        if ipv6_forward { "1" } else { "0" },
    );

    apply_nftables(&wan_interface, &lan_interfaces, nat44, &ipv6_mode, forward)
        .map_err(|error| napi::Error::from_reason(error.to_string()))
}
