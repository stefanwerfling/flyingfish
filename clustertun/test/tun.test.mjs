/**
 * Load + graceful-failure test for the native TUN binding (Cluster/Mesh epic
 * 9.5.1). Opening a TUN device needs CAP_NET_ADMIN, which the test environment
 * lacks, so this cannot exercise a successful open — that happens in the
 * privileged datapath container. What IS verified here: the addon loads and
 * exposes TunDevice.open, and open() without privileges throws cleanly instead of
 * crashing the process. Run with `node --test`.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const addon = require(fileURLToPath(new URL('../index.js', import.meta.url)));

test('the addon loads and exposes the TunDevice.open factory', () => {
    assert.equal(typeof addon.TunDevice, 'function');
    assert.equal(typeof addon.TunDevice.open, 'function');
});

test('open without CAP_NET_ADMIN fails cleanly (or succeeds where privileged)', () => {
    let device = null;

    try {
        device = addon.TunDevice.open('fftest0');
    } catch (error) {
        // expected in an unprivileged environment — must be a clean error, not a crash
        assert.ok(error instanceof Error);

        return;
    }

    // privileged environment: opening succeeded, so it must be a usable handle
    assert.equal(typeof device.ifName, 'string');
    device.close();
});
