/**
 * Unit tests for the SSH config-change IPC publisher (phase 3, step 5.1).
 *
 * Network-free: no Redis is connected in the unit environment, so publish() is
 * expected to be a graceful no-op (returns false, never throws). The payload
 * builder is validated against the shared schema.
 */
import {SchemaSshConfigChanged, SshConfigChangeAction} from 'flyingfish_schemas';
import {SshConfigChannel} from '../../src/inc/Ssh/SshConfigChannel.js';

describe('SshConfigChannel (IPC publisher)', () => {
    test('buildPayload produces a schema-valid payload', () => {
        const payload = SshConfigChannel.buildPayload(42, SshConfigChangeAction.saved);

        expect(payload).toEqual({sshportId: 42, action: SshConfigChangeAction.saved});
        expect(SchemaSshConfigChanged.validate(payload, [])).toBe(true);
    });

    test('buildPayload supports the deleted action', () => {
        const payload = SshConfigChannel.buildPayload(7, SshConfigChangeAction.deleted);

        expect(payload.action).toBe(SshConfigChangeAction.deleted);
        expect(SchemaSshConfigChanged.validate(payload, [])).toBe(true);
    });

    test('publish is a graceful no-op without a connected Redis client', async() => {
        const published = await SshConfigChannel.publish(42, SshConfigChangeAction.saved);

        expect(published).toBe(false);
    });
});