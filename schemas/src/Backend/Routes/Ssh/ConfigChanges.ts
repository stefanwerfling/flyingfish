import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';
import {SchemaSshConfigChanged} from '../../../Hub/SshConfigChanged.js';

/**
 * Poll request: the ssh server asks for SSH config changes newer than the last
 * sequence id it has already processed (0 on the first poll after start).
 */
export const SchemaSshConfigChangesRequest = Vts.object({
    since: Vts.number()
});

/**
 * SshConfigChangesRequest
 */
export type SshConfigChangesRequest = ExtractSchemaResultType<typeof SchemaSshConfigChangesRequest>;

/**
 * One SSH config change plus the monotonic sequence id the backend assigned it,
 * so the poller can advance its cursor.
 */
export const SchemaSshConfigChangeEntry = SchemaSshConfigChanged.extend({
    id: Vts.number()
});

/**
 * SshConfigChangeEntry
 */
export type SshConfigChangeEntry = ExtractSchemaResultType<typeof SchemaSshConfigChangeEntry>;

/**
 * Poll response: the changes since the requested sequence, the current highest
 * sequence (`lastSeq`, the new cursor), and `reset` — true when the backend
 * restarted or the requested cursor fell outside the retained window, so the
 * poller must adopt `lastSeq` and treat any gap as covered by DB read-on-connect.
 */
export const SchemaSshConfigChangesResponse = SchemaDefaultReturn.extend({
    changes: Vts.array(SchemaSshConfigChangeEntry),
    lastSeq: Vts.number(),
    reset: Vts.boolean()
});

/**
 * SshConfigChangesResponse
 */
export type SshConfigChangesResponse = ExtractSchemaResultType<typeof SchemaSshConfigChangesResponse>;
