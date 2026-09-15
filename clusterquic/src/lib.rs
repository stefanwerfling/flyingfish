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
use std::sync::Arc;

use anyhow::{anyhow, Result as AnyResult};
use napi_derive::napi;
use quinn::crypto::rustls::{QuicClientConfig, QuicServerConfig};
use quinn::{ClientConfig, Endpoint, ServerConfig};
use rustls::client::danger::{HandshakeSignatureValid, ServerCertVerified, ServerCertVerifier};
use rustls::pki_types::{CertificateDer, PrivateKeyDer, PrivatePkcs8KeyDer, ServerName, UnixTime};
use rustls::server::danger::{ClientCertVerified, ClientCertVerifier};
use rustls::{DigitallySignedStruct, DistinguishedName, SignatureScheme};

/// The ALPN protocol identifier for the cluster mesh QUIC transport. QUIC mandates
/// ALPN, and pinning our own keeps the mesh from negotiating anything else.
const ALPN: &[u8] = b"flyingfish-cluster";

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
