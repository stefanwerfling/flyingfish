/**
 * Unit tests for the SSH config-change IPC receiver (phase 3, step 5.1).
 *
 * Network-free: the channel's listen() is driven directly with payloads and a
 * stub SshServer, so no Redis and no ssh2 connection are involved. The core
 * Config is seated with a writable log dir so the Logger stays off /var/log.
 */
import {Config, Logger} from 'flyingfish_core';
import {SchemaSshConfigChanged, SshConfigChangeAction} from 'flyingfish_schemas';
import {SshConfigChangedChannel} from '../../src/inc/Ipc/SshConfigChangedChannel.js';
import {SshServer} from '../../src/inc/Ssh/SshServer.js';

/**
 * A recorded handleConfigChange call.
 */
type ConfigChangeCall = {
    sshportId: number;
    action: SshConfigChangeAction;
};

/**
 * Build a stub SshServer that records handleConfigChange calls.
 */
const makeServer = (): {server: SshServer; calls: ConfigChangeCall[];} => {
    const calls: ConfigChangeCall[] = [];

    const server = {
        handleConfigChange: (sshportId: number, action: SshConfigChangeAction): number => {
            calls.push({
                sshportId: sshportId,
                action: action
            });

            return calls.length;
        }
    } as unknown as SshServer;

    return {
        server: server,
        calls: calls
    };
};

beforeAll(() => {
    // Keep the Logger's file transport off /var/log/flyingfish in the test env.
    Config.getInstance().set({logging: {dirname: '/tmp/'}} as never);
    Logger.getLogger();
});

describe('SshConfigChangedChannel (IPC receiver)', () => {
    test('subscribes to the SSH_CONFIG_CHANGED channel', () => {
        const {server} = makeServer();
        const channel = new SshConfigChangedChannel(server);

        // The publisher and the receiver must agree on the channel name.
        expect(channel.getName()).toBe('ssh_config_changed');
    });

    test('the accepted payloads are schema-valid', () => {
        expect(SchemaSshConfigChanged.validate({
            sshportId: 42,
            action: SshConfigChangeAction.saved
        }, [])).toBe(true);
    });

    test('dispatches a valid saved payload to the server', async() => {
        const {server, calls} = makeServer();
        const channel = new SshConfigChangedChannel(server);

        await channel.listen({
            sshportId: 42,
            action: SshConfigChangeAction.saved
        });

        expect(calls).toEqual([{sshportId: 42, action: SshConfigChangeAction.saved}]);
    });

    test('dispatches a valid deleted payload to the server', async() => {
        const {server, calls} = makeServer();
        const channel = new SshConfigChangedChannel(server);

        await channel.listen({
            sshportId: 7,
            action: SshConfigChangeAction.deleted
        });

        expect(calls).toEqual([{sshportId: 7, action: SshConfigChangeAction.deleted}]);
    });

    test('ignores a schema-invalid payload', async() => {
        const {server, calls} = makeServer();
        const channel = new SshConfigChangedChannel(server);

        await channel.listen({sshportId: 'nope'} as never);

        expect(calls).toEqual([]);
    });
});