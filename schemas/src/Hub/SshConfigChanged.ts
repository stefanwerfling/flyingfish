import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * What happened to an SSH port/user configuration.
 */
export enum SshConfigChangeAction {
    saved = 'saved',
    deleted = 'deleted'
}

/**
 * Payload of the SSH_CONFIG_CHANGED Redis event: the backend publishes it when an
 * SSH port/user configuration is saved or deleted, so a consumer (e.g. the ssh
 * server, whose long-lived tunnels hold config from connection time) can reload
 * or close the affected forward.
 */
export const SchemaSshConfigChanged = Vts.object({
    sshportId: Vts.number(),
    action: Vts.enum(SshConfigChangeAction)
});

/**
 * SshConfigChanged
 */
export type SshConfigChanged = ExtractSchemaResultType<typeof SchemaSshConfigChanged>;