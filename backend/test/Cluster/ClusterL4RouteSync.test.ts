/**
 * Integration test for the cluster L4 route sync path (Cluster/Mesh epic 9.5.4),
 * fully in-process: the core HubClusterL4RouteProvider publishes through a fake
 * fetch into the REAL Hub ClusterL4RouteDirectory and reads back the flattened set,
 * then a ClusterL4RouteReconciler applies it — proving the wire contract between the
 * provider and the Hub directory and that each node only binds the routes assigned
 * to it. Network-free.
 */
import {
    ClusterL4Proto,
    ClusterL4Route,
    ClusterL4RouteHandle,
    ClusterL4RouteReconciler,
    HubClusterL4RouteProvider
} from 'flyingfish_core';
import {ClusterL4Route as ClusterL4RouteWire} from 'flyingfish_schemas';
import {ClusterL4RouteDirectory} from '../../src/Application/Hub/ClusterL4RouteDirectory.js';

/**
 * A fake fetch backed by a real ClusterL4RouteDirectory: POST .../routes/publish
 * feeds the directory, GET .../routes reads the flattened set.
 * @param directory - the Hub route directory
 */
const directoryFetch = (directory: ClusterL4RouteDirectory) =>
    async(url: string, init?: {method?: string; body?: string;}): Promise<{json(): Promise<unknown>;}> => {
        if (url.endsWith('/routes/publish')) {
            const body = JSON.parse(init!.body!) as {nodeUid: string; routes: ClusterL4RouteWire[];};
            directory.publish(body.nodeUid, body.routes);

            return {json: async(): Promise<unknown> => ({})};
        }

        return {json: async(): Promise<unknown> => ({list: directory.routes()})};
    };

const route = (id: string, ingressNodeUid: string): ClusterL4Route => ({
    id: id,
    proto: ClusterL4Proto.Tcp,
    ingressNodeUid: ingressNodeUid,
    listenPort: 6000,
    egressNodeUid: 'node-egress',
    targetHost: '10.0.0.5',
    targetPort: 5432
});

describe('cluster L4 route sync (provider ↔ Hub directory ↔ reconciler)', () => {
    test('a node publishes its routes and each node binds only the ones assigned to it', async() => {
        const directory = new ClusterL4RouteDirectory();
        const fetchImpl = directoryFetch(directory);

        const providerA = new HubClusterL4RouteProvider({hubUrl: 'http://hub', selfNodeUid: 'node-a', fetchImpl: fetchImpl});
        const providerB = new HubClusterL4RouteProvider({hubUrl: 'http://hub', selfNodeUid: 'node-b', fetchImpl: fetchImpl});

        // node-a owns an ingress route for itself; node-b owns one for itself
        await providerA.publish([route('a-svc', 'node-a')]);
        await providerB.publish([route('b-svc', 'node-b')]);

        const boundA: string[] = [];
        const boundB: string[] = [];
        const binderFor = (bound: string[]) => async(r: ClusterL4Route): Promise<ClusterL4RouteHandle> => {
            bound.push(r.id);

            return {close: async(): Promise<void> => undefined};
        };

        const reconcilerA = new ClusterL4RouteReconciler('node-a', binderFor(boundA));
        const reconcilerB = new ClusterL4RouteReconciler('node-b', binderFor(boundB));

        // both nodes see the FULL set, but each binds only its own route
        await reconcilerA.reconcile(await providerA.list());
        await reconcilerB.reconcile(await providerB.list());

        expect(boundA).toEqual(['a-svc']);
        expect(boundB).toEqual(['b-svc']);

        // node-a removes its route (publishes empty) → its listener is reconciled away
        await providerA.publish([]);
        await reconcilerA.reconcile(await providerA.list());
        expect(reconcilerA.activeCount()).toBe(0);
        // node-b's route is unaffected
        expect(reconcilerB.activeCount()).toBe(1);
    });

    test('a wildcard route is bound by every node', async() => {
        const directory = new ClusterL4RouteDirectory();
        const fetchImpl = directoryFetch(directory);

        const provider = new HubClusterL4RouteProvider({hubUrl: 'http://hub', selfNodeUid: 'node-a', fetchImpl: fetchImpl});
        await provider.publish([route('edge', '*')]);

        const boundA: string[] = [];
        const boundB: string[] = [];
        const reconcilerA = new ClusterL4RouteReconciler('node-a', async(r): Promise<ClusterL4RouteHandle> => {
            boundA.push(r.id);

            return {close: async(): Promise<void> => undefined};
        });
        const reconcilerB = new ClusterL4RouteReconciler('node-b', async(r): Promise<ClusterL4RouteHandle> => {
            boundB.push(r.id);

            return {close: async(): Promise<void> => undefined};
        });

        const routes = await provider.list();
        await reconcilerA.reconcile(routes);
        await reconcilerB.reconcile(routes);

        expect(boundA).toEqual(['edge']);
        expect(boundB).toEqual(['edge']);
    });
});