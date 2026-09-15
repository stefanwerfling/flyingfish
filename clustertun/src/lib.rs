//! FlyingFish cluster TUN datapath — native binding (Cluster/Mesh epic 9.5.1).
//!
//! The OWN native binding for the L3 datapath's TUN device: a napi-rs addon over
//! rust-tun that opens a Linux TUN interface and reads/writes raw IP packets, so
//! the JS `ClusterDatapath` (via a `NativeTunDevice` adapter behind
//! `IClusterTunDevice`) can bridge the kernel and the authenticated peer channels.
//! Opening a TUN device needs CAP_NET_ADMIN, so this runs in its own privileged
//! datapath container — the DB-free clusterserver control part never loads it.

use std::sync::Arc;
use std::sync::OnceLock;

use anyhow::{anyhow, Result as AnyResult};
use napi::bindgen_prelude::Buffer;
use napi::{Env, JsObject};
use napi_derive::napi;
use tokio::io::{AsyncReadExt, AsyncWriteExt, ReadHalf, WriteHalf};
use tokio::sync::Mutex as AsyncMutex;
use tun::AsyncDevice;

/// Read buffer bound — a jumbo-frame-safe upper limit for a single IP packet.
const READ_MTU: usize = 65_536;

/// The process-wide multi-threaded tokio runtime the TUN device I/O runs on, owned
/// here (not napi's) with all drivers enabled so the TUN fd always has a reactor.
static RUNTIME: OnceLock<tokio::runtime::Runtime> = OnceLock::new();

/// The shared runtime, initialised on first use.
fn runtime() -> &'static tokio::runtime::Runtime {
    RUNTIME.get_or_init(|| {
        tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .expect("clustertun: failed to build tokio runtime")
    })
}

/// Bridge a Rust future to a JS Promise on the shared runtime.
fn resolve_promise<T, F>(env: Env, fut: F) -> napi::Result<JsObject>
where
    T: napi::bindgen_prelude::ToNapiValue + Send + 'static,
    F: std::future::Future<Output = AnyResult<T>> + Send + 'static,
{
    #[allow(clippy::type_complexity)]
    let (deferred, promise) =
        env.create_deferred::<T, Box<dyn FnOnce(Env) -> napi::Result<T> + Send>>()?;

    runtime().spawn(async move {
        match fut.await {
            Ok(value) => deferred.resolve(Box::new(move |_env| Ok(value))),
            Err(err) => deferred.reject(napi::Error::from_reason(err.to_string())),
        }
    });

    Ok(promise)
}

/// A Linux TUN device: a reliable per-packet L3 pipe between the kernel and this
/// process. `recv`/`send` carry raw IP packets (opened with IFF_TUN | IFF_NO_PI,
/// so there is no packet-info prefix).
#[napi]
pub struct TunDevice {
    if_name: String,
    reader: Arc<AsyncMutex<ReadHalf<AsyncDevice>>>,
    writer: Arc<AsyncMutex<WriteHalf<AsyncDevice>>>,
}

#[napi]
impl TunDevice {
    /// Open (create) a TUN device with the given interface name and bring it up.
    /// Optionally assign the overlay IP (address + netmask) so the kernel routes
    /// the overlay subnet into it. Requires CAP_NET_ADMIN; fails cleanly otherwise.
    /// @param name - the TUN interface name (e.g. "ff0")
    /// @param address - the overlay IP to assign, e.g. "10.42.0.1" (optional)
    /// @param netmask - the overlay netmask, e.g. "255.255.0.0" (optional)
    #[napi(factory)]
    pub fn open(name: String, address: Option<String>, netmask: Option<String>) -> napi::Result<TunDevice> {
        runtime()
            .block_on(async move {
                let mut config = tun::Configuration::default();
                config.name(&name);

                if let Some(address) = address.as_deref() {
                    config.address(address);
                }

                if let Some(netmask) = netmask.as_deref() {
                    config.netmask(netmask);
                }

                config.up();

                let device = tun::create_as_async(&config).map_err(|e| anyhow!(e.to_string()))?;
                let (reader, writer) = tokio::io::split(device);

                Ok::<TunDevice, anyhow::Error>(TunDevice {
                    if_name: name,
                    reader: Arc::new(AsyncMutex::new(reader)),
                    writer: Arc::new(AsyncMutex::new(writer)),
                })
            })
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    /// The interface name the device was opened with.
    #[napi(getter)]
    pub fn if_name(&self) -> String {
        self.if_name.clone()
    }

    /// Read the next IP packet from the device, or null at end of stream.
    #[napi]
    pub fn recv(&self, env: Env) -> napi::Result<JsObject> {
        let reader = self.reader.clone();

        resolve_promise(env, async move {
            let mut guard = reader.lock().await;
            let mut buffer = vec![0u8; READ_MTU];
            let read = guard.read(&mut buffer).await?;

            if read == 0 {
                return Ok(None);
            }

            buffer.truncate(read);

            Ok(Some(Buffer::from(buffer)))
        })
    }

    /// Write one IP packet to the device.
    #[napi]
    pub fn send(&self, env: Env, packet: Buffer) -> napi::Result<JsObject> {
        let writer = self.writer.clone();
        let bytes = packet.to_vec();

        resolve_promise(env, async move {
            let mut guard = writer.lock().await;
            guard.write_all(&bytes).await?;

            Ok(())
        })
    }

    /// Close the device (best-effort shutdown of the write half; the fd is released
    /// when the last handle drops).
    #[napi]
    pub fn close(&self, env: Env) -> napi::Result<JsObject> {
        let writer = self.writer.clone();

        resolve_promise(env, async move {
            let mut guard = writer.lock().await;
            guard.shutdown().await.ok();

            Ok(())
        })
    }
}
