/**
 * Unit tests for the SSH config-change HTTP poller.
 *
 * Network-free: a stub fetch returns canned /json/ssh/config-changes responses
 * and a stub SshServer records handleConfigChange calls, so no HTTP and no ssh2
 * connection are involved. The core Config is seated with a writable log dir so
 * the Logger stays off /var/log.
 */
import {Config, Logger} from '@stefanwerfling/figtree';
import {SshConfigChangeAction} from 'flyingfish_schemas';
import {SshConfigPoller, SshPollFetch} from '../../src/inc/Ipc/SshConfigPoller.js';
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

/**
 * A stub fetch that returns the given JSON bodies in sequence and records the
 * request bodies it was called with.
 */
const makeFetch = (bodies: unknown[]): {fetchImpl: SshPollFetch; requests: string[];} => {
    const requests: string[] = [];
    let index = 0;

    const fetchImpl: SshPollFetch = (_url, init) => {
        requests.push(init?.body ?? '');
        const body = bodies[Math.min(index, bodies.length - 1)];
        index++;

        return Promise.resolve({
            json: (): Promise<unknown> => Promise.resolve(body)
        });
    };

    return {
        fetchImpl: fetchImpl,
        requests: requests
    };
};

beforeAll(() => {
    // Keep the Logger's file transport off /var/log/flyingfish in the test env.
    Config.getInstance().set({logging: {dirname: '/tmp/'}} as never);
    Logger.getLogger();
});

describe('SshConfigPoller (HTTP poll)', () => {
    test('applies changes to the server and advances the cursor', async() => {
        const {server, calls} = makeServer();
        const {fetchImpl, requests} = makeFetch([
            {
                statusCode: 200,
                changes: [
                    {id: 1, sshportId: 42, action: SshConfigChangeAction.saved},
                    {id: 2, sshportId: 7, action: SshConfigChangeAction.deleted}
                ],
                lastSeq: 2,
                reset: false
            },
            {statusCode: 200, changes: [], lastSeq: 2, reset: false}
        ]);

        const poller = new SshConfigPoller('https://flyingfish:3000', 'secret', server, 1000, fetchImpl);

        const appliedFirst = await poller.pollOnce();
        const appliedSecond = await poller.pollOnce();

        expect(appliedFirst).toBe(2);
        expect(appliedSecond).toBe(0);
        expect(calls).toEqual([
            {sshportId: 42, action: SshConfigChangeAction.saved},
            {sshportId: 7, action: SshConfigChangeAction.deleted}
        ]);
        // First poll starts at cursor 0, second poll uses the advanced cursor (2).
        expect(JSON.parse(requests[0]).since).toBe(0);
        expect(JSON.parse(requests[1]).since).toBe(2);
    });

    test('on reset it adopts lastSeq and applies nothing', async() => {
        const {server, calls} = makeServer();
        const {fetchImpl, requests} = makeFetch([
            {statusCode: 200, changes: [], lastSeq: 5, reset: true},
            {statusCode: 200, changes: [], lastSeq: 5, reset: false}
        ]);

        const poller = new SshConfigPoller('https://flyingfish:3000', 'secret', server, 1000, fetchImpl);

        const applied = await poller.pollOnce();
        await poller.pollOnce();

        expect(applied).toBe(0);
        expect(calls).toEqual([]);
        // After the reset, the cursor is 5.
        expect(JSON.parse(requests[1]).since).toBe(5);
    });

    test('a failing fetch is swallowed (returns 0, cursor unchanged)', async() => {
        const {server, calls} = makeServer();
        const fetchImpl: SshPollFetch = () => Promise.reject(new Error('boom'));

        const poller = new SshConfigPoller('https://flyingfish:3000', 'secret', server, 1000, fetchImpl);

        const applied = await poller.pollOnce();

        expect(applied).toBe(0);
        expect(calls).toEqual([]);
    });
});
