import {RedisClient} from 'figtree';
import {Logger, RedisChannels} from 'flyingfish_core';
import {SchemaSshConfigChanged, SshConfigChangeAction, SshConfigChanged} from 'flyingfish_schemas';

/**
 * SshConfigChannel
 *
 * Publishes SSH_CONFIG_CHANGED events over Redis when an SSH port/user
 * configuration is saved or deleted (phase 3, IPC). A consumer - the ssh server,
 * whose long-lived tunnels hold config from connection time - can then reload or
 * close the affected forward instead of relying on the shared DB alone.
 *
 * Redis is optional: without a connected client the publish is a graceful no-op.
 * Best-effort - it never throws (a failed IPC publish must not fail the route).
 */
export class SshConfigChannel {

    /**
     * Build the event payload.
     * @param {number} sshportId
     * @param {SshConfigChangeAction} action
     * @returns {SshConfigChanged}
     */
    public static buildPayload(sshportId: number, action: SshConfigChangeAction): SshConfigChanged {
        return {
            sshportId: sshportId,
            action: action
        };
    }

    /**
     * Publish an SSH config change over Redis (no-op if Redis is not connected).
     * @param {number} sshportId
     * @param {SshConfigChangeAction} action
     * @returns {Promise<boolean>} true if the event was published
     */
    public static async publish(sshportId: number, action: SshConfigChangeAction): Promise<boolean> {
        const payload = SshConfigChannel.buildPayload(sshportId, action);

        if (!SchemaSshConfigChanged.validate(payload, [])) {
            return false;
        }

        try {
            if (RedisClient.hasInstance() && RedisClient.getInstance().isConnected()) {
                await RedisClient.getInstance().sendChannel(
                    RedisChannels.SSH_CONFIG_CHANGED,
                    JSON.stringify(payload)
                );

                return true;
            }
        } catch (error) {
            Logger.getLogger().error('SshConfigChannel::publish: failed to publish SSH config change', error);
        }

        return false;
    }

}