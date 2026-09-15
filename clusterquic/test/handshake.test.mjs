/**
 * Handshake self-test for the cluster QUIC native binding (Cluster/Mesh epic
 * 9.5.1). Loads the built addon and drives one in-process QUIC mTLS handshake +
 * message roundtrip via `quicHandshakeSelftest`, asserting both sides saw the
 * other's certificate and the payload echoed back unchanged. This proves the
 * quinn + rustls + napi stack works on this platform before the real transport
 * surface is built on top. Run with `node --test`.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const addon = require(fileURLToPath(new URL('../index.js', import.meta.url)));

test('quicHandshakeSelftest completes a mutual-auth QUIC handshake and echoes the payload', () => {
    const result = addon.quicHandshakeSelftest('ping-over-quic');

    assert.equal(result.ok, true);
    assert.equal(result.serverSawClientCert, true, 'server must see the client certificate (mutual TLS)');
    assert.equal(result.clientSawServerCert, true, 'client must see the server certificate');
    assert.equal(result.echoed, 'ping-over-quic');
});
