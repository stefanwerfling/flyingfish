/**
 * Tests for the cluster-control method router (Cluster/Mesh epic 9.5.12, A+C): it
 * dispatches an inbound control request to the handler registered for its method,
 * passes the payload + requesting nodeUid through, answers an unknown method with an
 * error reply (never throws), and lets a re-register replace a method's handler.
 */
import {ClusterControlRequestRouter} from 'flyingfish_core';

describe('ClusterControlRequestRouter', () => {
    test('dispatches to the registered method handler with payload + fromNodeUid', async() => {
        const router = new ClusterControlRequestRouter();
        const seen: {payload: unknown; from: string;}[] = [];

        router.register('domain.write', async(payload, from) => {
            seen.push({payload: payload, from: from});

            return {ok: true, payload: {id: 1}};
        });

        const reply = await router.handle('domain.write', {name: 'x.test'}, 'node-a');

        expect(reply).toEqual({ok: true, payload: {id: 1}});
        expect(seen).toEqual([{payload: {name: 'x.test'}, from: 'node-a'}]);
    });

    test('an unknown method returns an error reply (does not throw)', async() => {
        const router = new ClusterControlRequestRouter();

        const reply = await router.handle('nope', {}, 'node-a');
        expect(reply.ok).toBe(false);
        expect(reply.error).toMatch(/unknown method 'nope'/u);
    });

    test('re-registering a method replaces its handler', async() => {
        const router = new ClusterControlRequestRouter();
        router.register('m', async() => ({ok: false, error: 'first'}));
        router.register('m', async() => ({ok: true, payload: 'second'}));

        expect(await router.handle('m', {}, 'node-a')).toEqual({ok: true, payload: 'second'});
    });
});