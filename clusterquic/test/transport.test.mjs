/**
 * End-to-end test for the native QUIC transport surface (Cluster/Mesh epic 9.5.1,
 * step 1). Drives two real in-process QuicTransport instances over loopback: the
 * dialer connects to the listener, both observe the other's certificate (mutual
 * TLS surfaced as PEM for the JS-side identity check), and bytes flow both ways
 * over the QUIC bi-stream. Run with `node --test`.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const addon = require(fileURLToPath(new URL('../index.js', import.meta.url)));

const {QuicTransport, generateSelfSignedIdentity} = addon;

test('two QUIC transports mutually authenticate and exchange bytes both ways', async() => {
    const serverId = generateSelfSignedIdentity('quic-server');
    const clientId = generateSelfSignedIdentity('quic-client');

    const server = new QuicTransport(serverId.certPem, serverId.keyPem);
    const client = new QuicTransport(clientId.certPem, clientId.keyPem);

    try {
        const port = await server.listen(0);
        assert.ok(port > 0, 'listen must return the bound port');

        const acceptedPromise = server.acceptPeer();
        const clientPeer = await client.connect('127.0.0.1', port);
        const serverPeer = await acceptedPromise;

        // each side sees the other's certificate (surfaced for ClusterPeerAuthenticator)
        assert.match(clientPeer.peerCertPem, /BEGIN CERTIFICATE/u);
        assert.match(serverPeer.peerCertPem, /BEGIN CERTIFICATE/u);

        // client -> server
        const serverRecv = serverPeer.recv();
        await clientPeer.send(Buffer.from('hello-from-client'));
        const gotOnServer = await serverRecv;
        assert.equal(Buffer.from(gotOnServer).toString(), 'hello-from-client');

        // server -> client
        const clientRecv = clientPeer.recv();
        await serverPeer.send(Buffer.from('hello-from-server'));
        const gotOnClient = await clientRecv;
        assert.equal(Buffer.from(gotOnClient).toString(), 'hello-from-server');

        clientPeer.close();
        serverPeer.close();
    } finally {
        await client.close();
        await server.close();
    }
});
