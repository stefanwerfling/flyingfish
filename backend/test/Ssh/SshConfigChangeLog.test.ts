/**
 * Unit tests for the SSH config-change log (HTTP-poll transport).
 *
 * The backend records SSH config changes here; the ssh server polls
 * /json/ssh/config-changes for changes newer than its cursor. This replaced the
 * former Redis SSH_CONFIG_CHANGED publisher. Network-free.
 */
import {SchemaSshConfigChanged, SshConfigChangeAction} from 'flyingfish_schemas';
import {SshConfigChangeLog} from '../../src/inc/Ssh/SshConfigChangeLog.js';

describe('SshConfigChangeLog (HTTP poll)', () => {
    test('record assigns increasing sequence ids and a schema-valid payload', () => {
        const first = SshConfigChangeLog.record(42, SshConfigChangeAction.saved);
        const second = SshConfigChangeLog.record(7, SshConfigChangeAction.deleted);

        expect(first).not.toBeNull();
        expect(second).not.toBeNull();
        expect(second!.id).toBeGreaterThan(first!.id);
        expect(SchemaSshConfigChanged.validate({sshportId: first!.sshportId, action: first!.action}, [])).toBe(true);
    });

    test('since returns only changes newer than the cursor', () => {
        const before = SshConfigChangeLog.since(0).lastSeq;
        const saved = SshConfigChangeLog.record(11, SshConfigChangeAction.saved);

        const result = SshConfigChangeLog.since(before);

        expect(result.reset).toBe(false);
        expect(result.lastSeq).toBe(saved!.id);
        expect(result.changes.some((c) => c.id === saved!.id && c.sshportId === 11)).toBe(true);
        // Polling again at the new cursor yields nothing.
        expect(SshConfigChangeLog.since(result.lastSeq).changes).toHaveLength(0);
    });

    test('since signals reset when the cursor is ahead of the log (backend restart)', () => {
        const lastSeq = SshConfigChangeLog.since(0).lastSeq;

        const result = SshConfigChangeLog.since(lastSeq + 1000);

        expect(result.reset).toBe(true);
        expect(result.changes).toHaveLength(0);
        expect(result.lastSeq).toBe(lastSeq);
    });
});
