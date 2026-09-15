//! FlyingFish cluster QUIC transport — native binding (Cluster/Mesh epic 9.5.1).
//!
//! This is the OWN native binding for the QUIC peer transport: a napi-rs addon
//! wrapping `quinn` (QUIC state machine) over `rustls` (TLS 1.3), so the cluster
//! mesh can carry its authenticated peer channels over QUIC — the NAT-friendly,
//! connection-migrating primary transport — behind the same `IClusterPeerTransport`
//! shape as the TCP-TLS and WSS transports.
//!
//! Authentication mirrors the other transports exactly: rustls is configured to
//! REQUEST a client certificate but NOT to validate the chain itself (accept-any
//! verifiers below); the peer certificate is surfaced to the JS side, which runs
//! the shared `ClusterPeerAuthenticator` (verify against the cluster CA + require
//! the `flyingfish://cluster/<nodeUid>` purpose). This first milestone only proves
//! the whole stack — build, QUIC handshake, mutual cert exchange, message roundtrip
//! — via a single self-contained self-test; the full listen/connect surface follows.

use std::net::{Ipv4Addr, SocketAddr, SocketAddrV4};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, OnceLock};

use anyhow::{anyhow, Result as AnyResult};
use napi::bindgen_prelude::Buffer;
use napi::{Env, JsObject};
use napi_derive::napi;
use quinn::crypto::rustls::{QuicClientConfig, QuicServerConfig};
use quinn::{ClientConfig, Connection, Endpoint, RecvStream, SendStream, ServerConfig};
use rustls::client::danger::{HandshakeSignatureValid, ServerCertVerified, ServerCertVerifier};
use rustls::pki_types::{CertificateDer, PrivateKeyDer, PrivatePkcs8KeyDer, ServerName, UnixTime};
use rustls::server::danger::{ClientCertVerified, ClientCertVerifier};
use rustls::{DigitallySignedStruct, DistinguishedName, SignatureScheme};
use tokio::sync::Mutex as AsyncMutex;

/// The ALPN protocol identifier for the cluster mesh QUIC transport. QUIC mandates
/// ALPN, and pinning our own keeps the mesh from negotiating anything else.
const ALPN: &[u8] = b"flyingfish-cluster";

/// Magic bytes the dialer writes as the first stream frame so the accepting side's
/// `accept_bi` completes immediately (a QUIC bi-stream is invisible to the peer
/// until the opener sends its first frame). Consumed on the accepting side, so the
/// app byte stream that `ClusterPeerChannel` frames starts clean after it.
const STREAM_MAGIC: &[u8; 4] = b"FFQ1";

/// The per-read chunk bound for the peer streams.
const RECV_CHUNK: usize = 64 * 1024;

/// The process-wide multi-threaded tokio runtime the QUIC endpoints run on. Owned
/// here (not napi's) with all drivers enabled, so quinn's UDP I/O always has a
/// reactor regardless of how the host configured napi.
static RUNTIME: OnceLock<tokio::runtime::Runtime> = OnceLock::new();

/// The shared runtime, initialised on first use.
fn runtime() -> &'static tokio::runtime::Runtime {
    RUNTIME.get_or_init(|| {
        tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .expect("clusterquic: failed to build tokio runtime")
    })
}

/// Bridge a Rust future to a JS Promise: run `fut` on the shared runtime and
/// resolve/reject the returned Promise with its result. Keeps the JS thread free
/// and does not depend on napi's own async runtime.
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

/// A read buffer bound for the self-test streams.
const READ_LIMIT: usize = 64 * 1024;

/// The ring provider's supported signature schemes (both verifiers accept these).
fn supported_schemes() -> Vec<SignatureScheme> {
    rustls::crypto::ring::default_provider()
        .signature_verification_algorithms
        .supported_schemes()
}

/// Server-side "accept any client certificate" verifier: rustls does no chain
/// validation (the JS side runs the real cluster-CA + purpose check); this only
/// records that a client certificate was presented.
#[derive(Debug)]
struct AcceptAnyClientCert {
    saw_cert: Arc<AtomicBool>,
}

impl ClientCertVerifier for AcceptAnyClientCert {
    fn root_hint_subjects(&self) -> &[DistinguishedName] {
        &[]
    }

    fn verify_client_cert(
        &self,
        end_entity: &CertificateDer<'_>,
        _intermediates: &[CertificateDer<'_>],
        _now: UnixTime,
    ) -> Result<ClientCertVerified, rustls::Error> {
        if !end_entity.as_ref().is_empty() {
            self.saw_cert.store(true, Ordering::SeqCst);
        }

        Ok(ClientCertVerified::assertion())
    }

    fn verify_tls12_signature(
        &self,
        _message: &[u8],
        _cert: &CertificateDer<'_>,
        _dss: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, rustls::Error> {
        Ok(HandshakeSignatureValid::assertion())
    }

    fn verify_tls13_signature(
        &self,
        _message: &[u8],
        _cert: &CertificateDer<'_>,
        _dss: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, rustls::Error> {
        Ok(HandshakeSignatureValid::assertion())
    }

    fn supported_verify_schemes(&self) -> Vec<SignatureScheme> {
        supported_schemes()
    }
}

/// Client-side "accept any server certificate" verifier — the mirror of
/// `AcceptAnyClientCert` for the dialing side.
#[derive(Debug)]
struct AcceptAnyServerCert {
    saw_cert: Arc<AtomicBool>,
}

impl ServerCertVerifier for AcceptAnyServerCert {
    fn verify_server_cert(
        &self,
        end_entity: &CertificateDer<'_>,
        _intermediates: &[CertificateDer<'_>],
        _server_name: &ServerName<'_>,
        _ocsp_response: &[u8],
        _now: UnixTime,
    ) -> Result<ServerCertVerified, rustls::Error> {
        if !end_entity.as_ref().is_empty() {
            self.saw_cert.store(true, Ordering::SeqCst);
        }

        Ok(ServerCertVerified::assertion())
    }

    fn verify_tls12_signature(
        &self,
        _message: &[u8],
        _cert: &CertificateDer<'_>,
        _dss: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, rustls::Error> {
        Ok(HandshakeSignatureValid::assertion())
    }

    fn verify_tls13_signature(
        &self,
        _message: &[u8],
        _cert: &CertificateDer<'_>,
        _dss: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, rustls::Error> {
        Ok(HandshakeSignatureValid::assertion())
    }

    fn supported_verify_schemes(&self) -> Vec<SignatureScheme> {
        supported_schemes()
    }
}

/// The result of the QUIC handshake self-test.
#[napi(object)]
pub struct QuicHandshakeResult {
    /// Whether the handshake + message roundtrip completed.
    pub ok: bool,
    /// The server observed the client's certificate (mutual auth).
    pub server_saw_client_cert: bool,
    /// The client observed the server's certificate.
    pub client_saw_server_cert: bool,
    /// The message echoed back by the server (must equal the input).
    pub echoed: String,
}

/// Generate a self-signed certificate + PKCS#8 key for the self-test.
fn self_signed(name: &str) -> AnyResult<(CertificateDer<'static>, PrivateKeyDer<'static>)> {
    let certified = rcgen::generate_simple_self_signed(vec![name.to_string()])?;
    let cert = CertificateDer::from(certified.cert.der().to_vec());
    let key = PrivateKeyDer::Pkcs8(PrivatePkcs8KeyDer::from(certified.key_pair.serialize_der()));

    Ok((cert, key))
}

/// Run a full in-process QUIC mTLS handshake and one message roundtrip.
fn run_selftest(message: String) -> AnyResult<QuicHandshakeResult> {
    rustls::crypto::ring::default_provider().install_default().ok();

    let (server_cert, server_key) = self_signed("localhost")?;
    let (client_cert, client_key) = self_signed("client")?;

    let saw_client_cert = Arc::new(AtomicBool::new(false));
    let saw_server_cert = Arc::new(AtomicBool::new(false));

    let mut server_crypto = rustls::ServerConfig::builder()
        .with_client_cert_verifier(Arc::new(AcceptAnyClientCert {
            saw_cert: saw_client_cert.clone(),
        }))
        .with_single_cert(vec![server_cert], server_key)?;
    server_crypto.alpn_protocols = vec![ALPN.to_vec()];

    let mut client_crypto = rustls::ClientConfig::builder()
        .dangerous()
        .with_custom_certificate_verifier(Arc::new(AcceptAnyServerCert {
            saw_cert: saw_server_cert.clone(),
        }))
        .with_client_auth_cert(vec![client_cert], client_key)?;
    client_crypto.alpn_protocols = vec![ALPN.to_vec()];

    let server_config =
        ServerConfig::with_crypto(Arc::new(QuicServerConfig::try_from(server_crypto).map_err(|e| anyhow!(e.to_string()))?));
    let client_config =
        ClientConfig::new(Arc::new(QuicClientConfig::try_from(client_crypto).map_err(|e| anyhow!(e.to_string()))?));

    let runtime = tokio::runtime::Builder::new_multi_thread().enable_all().build()?;

    runtime.block_on(async move {
        let bind: SocketAddr = SocketAddr::V4(SocketAddrV4::new(Ipv4Addr::LOCALHOST, 0));
        let endpoint = Endpoint::server(server_config, bind)?;
        let server_addr = endpoint.local_addr()?;

        let server_endpoint = endpoint.clone();
        let server = tokio::spawn(async move {
            if let Some(incoming) = server_endpoint.accept().await {
                let connection = incoming.await?;
                let (mut send, mut recv) = connection.accept_bi().await?;
                let data = recv.read_to_end(READ_LIMIT).await?;
                send.write_all(&data).await?;
                send.finish()?;
                connection.closed().await;
            }

            Ok::<(), anyhow::Error>(())
        });

        let mut client_endpoint = Endpoint::client(SocketAddr::V4(SocketAddrV4::new(Ipv4Addr::LOCALHOST, 0)))?;
        client_endpoint.set_default_client_config(client_config);

        let connection = client_endpoint.connect(server_addr, "localhost")?.await?;
        let (mut send, mut recv) = connection.open_bi().await?;
        send.write_all(message.as_bytes()).await?;
        send.finish()?;

        let echoed = recv.read_to_end(READ_LIMIT).await?;
        let echoed = String::from_utf8_lossy(&echoed).to_string();

        connection.close(0u32.into(), b"done");
        server.await.map_err(|e| anyhow!(e.to_string()))??;
        endpoint.wait_idle().await;

        Ok(QuicHandshakeResult {
            ok: true,
            server_saw_client_cert: saw_client_cert.load(Ordering::SeqCst),
            client_saw_server_cert: saw_server_cert.load(Ordering::SeqCst),
            echoed,
        })
    })
}

/// Self-test entry point: run a full QUIC mTLS handshake + message roundtrip in
/// process and report the result. Proves the native binding's whole stack works on
/// this platform before the real transport surface is built on top.
#[napi]
pub fn quic_handshake_selftest(message: String) -> napi::Result<QuicHandshakeResult> {
    run_selftest(message).map_err(|e| napi::Error::from_reason(e.to_string()))
}

/// A self-signed identity (cert + key, both PEM).
#[napi(object)]
pub struct SelfSignedIdentity {
    pub cert_pem: String,
    pub key_pem: String,
}

/// Generate a self-signed certificate + key as PEM. A convenience for tests and
/// local bring-up — the mesh uses real PKI cluster node-certs (verified JS-side),
/// but the QUIC layer only needs a valid cert/key since it does not validate the
/// chain itself.
#[napi]
pub fn generate_self_signed_identity(common_name: String) -> napi::Result<SelfSignedIdentity> {
    let certified = rcgen::generate_simple_self_signed(vec![common_name])
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    Ok(SelfSignedIdentity {
        cert_pem: certified.cert.pem(),
        key_pem: certified.key_pair.serialize_pem(),
    })
}

/// Parse a PEM cert chain and private key.
fn parse_identity(
    cert_pem: &str,
    key_pem: &str,
) -> AnyResult<(Vec<CertificateDer<'static>>, PrivateKeyDer<'static>)> {
    let certs = rustls_pemfile::certs(&mut cert_pem.as_bytes()).collect::<Result<Vec<_>, _>>()?;

    if certs.is_empty() {
        return Err(anyhow!("no certificate found in PEM"));
    }

    let key = rustls_pemfile::private_key(&mut key_pem.as_bytes())?
        .ok_or_else(|| anyhow!("no private key found in PEM"))?;

    Ok((certs, key))
}

/// Build the quinn server + client configs from this node's identity. Both run
/// mutual TLS but leave chain validation to the JS side (accept-any verifiers),
/// exactly like the TCP-TLS and WSS transports; the peer cert is surfaced to JS,
/// which runs the shared cluster-CA + purpose check.
fn build_configs(cert_pem: &str, key_pem: &str) -> AnyResult<(ServerConfig, ClientConfig)> {
    let (certs, key) = parse_identity(cert_pem, key_pem)?;

    let mut server_crypto = rustls::ServerConfig::builder()
        .with_client_cert_verifier(Arc::new(AcceptAnyClientCert {
            saw_cert: Arc::new(AtomicBool::new(false)),
        }))
        .with_single_cert(certs.clone(), key.clone_key())?;
    server_crypto.alpn_protocols = vec![ALPN.to_vec()];

    let mut client_crypto = rustls::ClientConfig::builder()
        .dangerous()
        .with_custom_certificate_verifier(Arc::new(AcceptAnyServerCert {
            saw_cert: Arc::new(AtomicBool::new(false)),
        }))
        .with_client_auth_cert(certs, key)?;
    client_crypto.alpn_protocols = vec![ALPN.to_vec()];

    let server_config =
        ServerConfig::with_crypto(Arc::new(QuicServerConfig::try_from(server_crypto).map_err(|e| anyhow!(e.to_string()))?));
    let client_config =
        ClientConfig::new(Arc::new(QuicClientConfig::try_from(client_crypto).map_err(|e| anyhow!(e.to_string()))?));

    Ok((server_config, client_config))
}

/// PEM-encode a connection's peer leaf certificate for the JS-side identity check.
fn peer_cert_pem(connection: &Connection) -> AnyResult<String> {
    let identity = connection
        .peer_identity()
        .ok_or_else(|| anyhow!("peer presented no certificate"))?;
    let certs = identity
        .downcast::<Vec<CertificateDer<'static>>>()
        .map_err(|_| anyhow!("unexpected peer identity type"))?;
    let leaf = certs.first().ok_or_else(|| anyhow!("empty peer certificate chain"))?;

    Ok(pem::encode(&pem::Pem::new("CERTIFICATE", leaf.as_ref().to_vec())))
}

/// One authenticated QUIC peer connection with a single bidirectional stream. The
/// stream is a reliable ordered byte pipe; `ClusterPeerChannel` on the JS side
/// applies its length framing over it, so this exposes raw `send`/`recv`.
#[napi]
pub struct QuicPeer {
    peer_cert: String,
    connection: Connection,
    send: Arc<AsyncMutex<SendStream>>,
    recv: Arc<AsyncMutex<RecvStream>>,
}

impl QuicPeer {
    /// Assemble a peer from its connection + stream halves.
    fn from_parts(peer_cert: String, connection: Connection, send: SendStream, recv: RecvStream) -> Self {
        QuicPeer {
            peer_cert,
            connection,
            send: Arc::new(AsyncMutex::new(send)),
            recv: Arc::new(AsyncMutex::new(recv)),
        }
    }
}

#[napi]
impl QuicPeer {
    /// The peer's leaf certificate in PEM — fed to the shared ClusterPeerAuthenticator.
    #[napi(getter)]
    pub fn peer_cert_pem(&self) -> String {
        self.peer_cert.clone()
    }

    /// Read the next chunk of bytes from the peer, or null when the stream ends.
    #[napi]
    pub fn recv(&self, env: Env) -> napi::Result<JsObject> {
        let recv = self.recv.clone();

        resolve_promise(env, async move {
            let mut guard = recv.lock().await;
            let mut buffer = vec![0u8; RECV_CHUNK];

            match guard.read(&mut buffer).await? {
                Some(read) => {
                    buffer.truncate(read);
                    Ok(Some(Buffer::from(buffer)))
                }
                None => Ok(None),
            }
        })
    }

    /// Write a chunk of bytes to the peer.
    #[napi]
    pub fn send(&self, env: Env, data: Buffer) -> napi::Result<JsObject> {
        let send = self.send.clone();
        let bytes = data.to_vec();

        resolve_promise(env, async move {
            let mut guard = send.lock().await;
            guard.write_all(&bytes).await?;

            Ok(())
        })
    }

    /// Close the connection to the peer.
    #[napi]
    pub fn close(&self) {
        self.connection.close(0u32.into(), b"bye");
    }
}

/// The native QUIC peer transport (Cluster/Mesh epic 9.5.1): our own binding that
/// gives the JS `ClusterQuicPeerTransport` the QUIC I/O it drives behind
/// `IClusterPeerTransport`. One instance both listens (server endpoint) and dials
/// (client endpoint); every accepted/dialed peer is a mutually-authenticated
/// {@link QuicPeer}.
#[napi]
pub struct QuicTransport {
    server_config: ServerConfig,
    client_config: ClientConfig,
    server_endpoint: Arc<AsyncMutex<Option<Endpoint>>>,
    client_endpoint: Arc<AsyncMutex<Option<Endpoint>>>,
}

#[napi]
impl QuicTransport {
    /// Build a transport from this node's cluster identity (cert + key PEM).
    #[napi(constructor)]
    pub fn new(cert_pem: String, key_pem: String) -> napi::Result<Self> {
        rustls::crypto::ring::default_provider().install_default().ok();

        let (server_config, client_config) =
            build_configs(&cert_pem, &key_pem).map_err(|e| napi::Error::from_reason(e.to_string()))?;

        Ok(QuicTransport {
            server_config,
            client_config,
            server_endpoint: Arc::new(AsyncMutex::new(None)),
            client_endpoint: Arc::new(AsyncMutex::new(None)),
        })
    }

    /// Start the server endpoint on the given port (0 = OS-assigned). Resolves the
    /// bound port.
    #[napi]
    pub fn listen(&self, env: Env, port: u16) -> napi::Result<JsObject> {
        let server_config = self.server_config.clone();
        let slot = self.server_endpoint.clone();

        resolve_promise(env, async move {
            let bind = SocketAddr::V4(SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, port));
            let endpoint = Endpoint::server(server_config, bind)?;
            let local_port = endpoint.local_addr()?.port();
            *slot.lock().await = Some(endpoint);

            Ok(local_port as u32)
        })
    }

    /// Await the next inbound authenticated peer. Rejects once the endpoint closes,
    /// which the JS accept loop treats as its stop signal.
    #[napi]
    pub fn accept_peer(&self, env: Env) -> napi::Result<JsObject> {
        let slot = self.server_endpoint.clone();

        resolve_promise(env, async move {
            let endpoint = slot
                .lock()
                .await
                .clone()
                .ok_or_else(|| anyhow!("transport is not listening"))?;

            let incoming = endpoint.accept().await.ok_or_else(|| anyhow!("endpoint closed"))?;
            let connection = incoming.await?;
            let (send, mut recv) = connection.accept_bi().await?;

            let mut magic = [0u8; STREAM_MAGIC.len()];
            recv.read_exact(&mut magic).await?;

            if &magic != STREAM_MAGIC {
                return Err(anyhow!("bad stream magic from peer"));
            }

            let peer_cert = peer_cert_pem(&connection)?;

            Ok(QuicPeer::from_parts(peer_cert, connection, send, recv))
        })
    }

    /// Dial a peer and open the authenticated channel.
    #[napi]
    pub fn connect(&self, env: Env, host: String, port: u16) -> napi::Result<JsObject> {
        let client_config = self.client_config.clone();
        let slot = self.client_endpoint.clone();

        resolve_promise(env, async move {
            let endpoint = {
                let mut guard = slot.lock().await;

                if guard.is_none() {
                    let mut endpoint =
                        Endpoint::client(SocketAddr::V4(SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, 0)))?;
                    endpoint.set_default_client_config(client_config);
                    *guard = Some(endpoint);
                }

                guard.clone().expect("client endpoint just set")
            };

            let addr = tokio::net::lookup_host((host.as_str(), port))
                .await?
                .next()
                .ok_or_else(|| anyhow!("could not resolve {host}:{port}"))?;

            let connection = endpoint.connect(addr, &host)?.await?;
            let (mut send, recv) = connection.open_bi().await?;
            send.write_all(STREAM_MAGIC).await?;

            let peer_cert = peer_cert_pem(&connection)?;

            Ok(QuicPeer::from_parts(peer_cert, connection, send, recv))
        })
    }

    /// Close both endpoints.
    #[napi]
    pub fn close(&self, env: Env) -> napi::Result<JsObject> {
        let server_slot = self.server_endpoint.clone();
        let client_slot = self.client_endpoint.clone();

        resolve_promise(env, async move {
            if let Some(endpoint) = server_slot.lock().await.take() {
                endpoint.close(0u32.into(), b"bye");
                endpoint.wait_idle().await;
            }

            if let Some(endpoint) = client_slot.lock().await.take() {
                endpoint.close(0u32.into(), b"bye");
                endpoint.wait_idle().await;
            }

            Ok(())
        })
    }
}
