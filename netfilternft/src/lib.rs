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
use rustables::{
    Batch, Chain, ChainPolicy, ChainType, Hook, HookClass, MsgType, ProtocolFamily, Rule, Table,
    list_tables,
};
use std::error::Error;
use std::net::Ipv6Addr;

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

/// One LAN interface + its own NAT settings (Pi-router UI v2 — NAT is per LAN).
#[napi(object)]
pub struct LanNat {
    pub name: String,
    pub nat44: bool,
    /// `off` | `nat66` (masquerade) | `pd` (route, no NAT). JS name: `ipv6Mode`.
    pub ipv6_mode: String,
}

/// Add a NAT table (family-specific) with a postrouting chain that masquerades each of
/// the given LAN interfaces → WAN (one scoped `iiface <lan> oiface <wan> masquerade` rule
/// per LAN, so each LAN's NAT is independent).
fn add_nat_table(
    batch: &mut Batch,
    name: &str,
    family: ProtocolFamily,
    wan: &str,
    lans: &[&str],
) -> Result<(), Box<dyn Error>> {
    let table = Table::new(family).with_name(name);
    batch.add(&table, MsgType::Add);

    let postrouting = Chain::new(&table)
        .with_name("postrouting")
        .with_type(ChainType::Nat)
        .with_hook(Hook::new(HookClass::PostRouting, NAT_PRIORITY))
        .with_policy(ChainPolicy::Accept)
        .add_to_batch(batch);

    for lan in lans {
        Rule::new(&postrouting)?
            .iiface(lan)?
            .oiface(wan)?
            .masquerade()
            .add_to_batch(batch);
    }

    Ok(())
}

/// Build + send the whole nftables ruleset for the given router config.
fn apply_nftables(
    wan: &str,
    lans: &[LanNat],
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

        if !forward && has_wan {
            for lan in lans {
                Rule::new(&forward_chain)?
                    .iiface(&lan.name)?
                    .oiface(wan)?
                    .drop()
                    .add_to_batch(&mut batch);
            }
        }
    }

    // NAT44: masquerade each LAN that has nat44 on → WAN.
    let nat4: Vec<&str> = lans.iter().filter(|lan| lan.nat44).map(|lan| lan.name.as_str()).collect();
    if has_wan && !nat4.is_empty() {
        add_nat_table(&mut batch, NAT4_TABLE, ProtocolFamily::Ipv4, wan, &nat4)?;
    }

    // NAT66: masquerade each LAN in nat66 OR pd-server mode → WAN (both hand out ULA,
    // which needs NAT to reach the internet; `pd` routes an upstream GUA, `off` neither).
    let nat6: Vec<&str> = lans
        .iter()
        .filter(|lan| lan.ipv6_mode == "nat66" || lan.ipv6_mode == "pd-server")
        .map(|lan| lan.name.as_str())
        .collect();
    if has_wan && !nat6.is_empty() {
        add_nat_table(&mut batch, NAT6_TABLE, ProtocolFamily::Ipv6, wan, &nat6)?;
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
#[napi]
pub fn apply_router(
    wan_interface: String,
    lans: Vec<LanNat>,
    forward: bool,
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

    apply_nftables(&wan_interface, &lans, forward)
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
