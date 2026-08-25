/**
 * Unit tests for SshServer.selectAffected (phase 3, step 5.1).
 *
 * Network-free and pure: selectAffected is exercised with stub clients (only the
 * getSshPortId() contract matters), so no ssh2 server or connection is created.
 */
import {SshServer} from '../../src/inc/Ssh/SshServer.js';
import {SshClient} from '../../src/inc/Ssh/SshClient.js';

/**
 * Build a stub SshClient reporting a fixed sshportId.
 */
const client = (sshportId: number|undefined): SshClient => ({
    getSshPortId: (): number|undefined => sshportId
}) as unknown as SshClient;

describe('SshServer.selectAffected', () => {
    test('returns only clients bound to the given ssh port', () => {
        const a = client(1);
        const b = client(2);
        const c = client(1);

        const affected = SshServer.selectAffected([a, b, c], 1);

        expect(affected).toEqual([a, c]);
    });

    test('returns an empty list when no client matches', () => {
        const affected = SshServer.selectAffected([client(2), client(3)], 1);

        expect(affected).toEqual([]);
    });

    test('ignores not-yet-authenticated clients (undefined sshportId)', () => {
        const authed = client(5);
        const affected = SshServer.selectAffected([client(undefined), authed], 5);

        expect(affected).toEqual([authed]);
    });
});