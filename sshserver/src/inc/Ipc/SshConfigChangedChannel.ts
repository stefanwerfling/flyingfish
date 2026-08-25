import {Logger, RedisChannel, RedisChannels} from 'flyingfish_core';
import {SchemaSshConfigChanged, SshConfigChanged} from 'flyingfish_schemas';
import {SshServer} from '../Ssh/SshServer.js';

/**
 * SshConfigChangedChannel
 *
 * Consumes SSH_CONFIG_CHANGED events (phase 3, IPC). The backend publishes one
 * when an SSH port/user configuration is saved or deleted. Long-lived tunnels
 * hold their config from connection time, so the affected forward is closed to
 * force a reconnect with the fresh config (on delete the config is simply gone).
 */
export class SshConfigChangedChannel extends RedisChannel<SshConfigChanged> {

    /**
     * ssh server whose active connections react to the change
     * @protected
     */
    protected _server: SshServer;

    /**
     * Constructor
     * @param {SshServer} server
     */
    public constructor(server: SshServer) {
        super(RedisChannels.SSH_CONFIG_CHANGED);
        this._server = server;
    }

    /**
     * Channel listen
     * @param {SshConfigChanged} data
     */
    public async listen(data: SshConfigChanged): Promise<void> {
        if (!SchemaSshConfigChanged.validate(data, [])) {
            Logger.getLogger().warn('SshConfigChangedChannel::listen: received invalid payload, ignored.');
            return;
        }

        Logger.getLogger().info(
            'SshConfigChangedChannel::listen: ssh config %s for sshportId %d',
            data.action,
            data.sshportId
        );

        this._server.handleConfigChange(data.sshportId, data.action);
    }

}