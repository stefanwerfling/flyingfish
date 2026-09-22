import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * What happened to an SSH port/user configuration.
 */
export enum SshConfigChangeAction {
    saved = 'saved',
    deleted = 'deleted'
}

/**
 * An SSH port/user configuration change: what happened to which SSH port. The
 * backend records one when an SSH config is saved or deleted; the ssh server
 * polls for these (whose long-lived tunnels hold config from connection time) to
 * reload or close the affected forward. Base of {@link SchemaSshConfigChangeEntry}.
 */
export const SchemaSshConfigChanged = Vts.object({
    sshportId: Vts.number(),
    action: Vts.enum(SshConfigChangeAction)
});

/**
 * SshConfigChanged
 */
export type SshConfigChanged = ExtractSchemaResultType<typeof SchemaSshConfigChanged>;