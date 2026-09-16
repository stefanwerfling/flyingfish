/**
 * Unit tests for the cluster L4 route reconciler (Cluster/Mesh epic 9.5.4): binds
 * routes assigned to this node (its nodeUid or the wildcard), ignores routes for
 * other nodes, no-ops an unchanged set, closes listeners whose route disappears or
 * changes (and rebinds on change), and closeAll tears everything down. Driven by a
 * fake binder — network-free.
 */
import {
    CLUSTER_L4_ROUTE_ANY,
    ClusterL4Proto,
    ClusterL4Route,
    ClusterL4RouteHandle,
    ClusterL4RouteReconciler
} from 'flyingfish_core';

/**
 * A fake binder recording every bind and close, handing back closable handles.
 */
const createBinder = (): {
    binder: (route: ClusterL4Route) => Promise<ClusterL4RouteHandle | null>;
    bound: string[];
    closed: string[];
    failIds: Set<string>;
} => {
    const bound: string[] = [];
    const closed: string[] = [];
    const failIds = new Set<string>();

    return {
        bound: bound,
        closed: closed,
        failIds: failIds,
        binder: async(route: ClusterL4Route): Promise<ClusterL4RouteHandle | null> => {
            if (failIds.has(route.id)) {
                return null;
            }

            bound.push(route.id);

            return {
                close: async(): Promise<void> => {
                    closed.push(route.id);
                }
            };
        }
    };
};

/**
 * Build a route with sensible defaults.
 * @param id - the route id
 * @param ingressNodeUid - the ingress node (or wildcard)
 * @param overrides - field overrides
 */
const route = (id: string, ingressNodeUid: string, overrides: Partial<ClusterL4Route> = {}): ClusterL4Route => ({
    id: id,
    proto: ClusterL4Proto.Tcp,
    ingressNodeUid: ingressNodeUid,
    listenPort: 6000,
    egressNodeUid: 'node-egress',
    targetHost: '10.0.0.5',
    targetPort: 5432,
    ...overrides
});

describe('ClusterL4RouteReconciler', () => {
    test('binds routes assigned to this node and ignores others', async() => {
        const fake = createBinder();
        const reconciler = new ClusterL4RouteReconciler('node-a', fake.binder);

        await reconciler.reconcile([
            route('r1', 'node-a'),
            route('r2', 'node-b'),
            route('r3', CLUSTER_L4_ROUTE_ANY)
        ]);

        expect(fake.bound.sort()).toEqual(['r1', 'r3']);
        expect(reconciler.activeCount()).toBe(2);
    });

    test('an unchanged route set is a no-op (no rebind)', async() => {
        const fake = createBinder();
        const reconciler = new ClusterL4RouteReconciler('node-a', fake.binder);
        const routes = [route('r1', 'node-a'), route('r2', CLUSTER_L4_ROUTE_ANY)];

        await reconciler.reconcile(routes);
        await reconciler.reconcile(routes);

        expect(fake.bound).toEqual(['r1', 'r2']);
        expect(fake.closed).toEqual([]);
    });

    test('closes the listener when a route disappears', async() => {
        const fake = createBinder();
        const reconciler = new ClusterL4RouteReconciler('node-a', fake.binder);

        await reconciler.reconcile([route('r1', 'node-a'), route('r2', 'node-a')]);
        await reconciler.reconcile([route('r1', 'node-a')]);

        expect(fake.closed).toEqual(['r2']);
        expect(reconciler.activeCount()).toBe(1);
    });

    test('rebinds when a route materially changes', async() => {
        const fake = createBinder();
        const reconciler = new ClusterL4RouteReconciler('node-a', fake.binder);

        await reconciler.reconcile([route('r1', 'node-a', {targetPort: 1000})]);
        await reconciler.reconcile([route('r1', 'node-a', {targetPort: 2000})]);

        expect(fake.closed).toEqual(['r1']);
        expect(fake.bound).toEqual(['r1', 'r1']);
        expect(reconciler.activeCount()).toBe(1);
    });

    test('a failed bind is not tracked and is retried next reconcile', async() => {
        const fake = createBinder();
        const reconciler = new ClusterL4RouteReconciler('node-a', fake.binder);

        fake.failIds.add('r1');
        await reconciler.reconcile([route('r1', 'node-a')]);
        expect(reconciler.activeCount()).toBe(0);

        fake.failIds.clear();
        await reconciler.reconcile([route('r1', 'node-a')]);
        expect(reconciler.activeCount()).toBe(1);
        expect(fake.bound).toEqual(['r1']);
    });

    test('closeAll tears down every bound listener', async() => {
        const fake = createBinder();
        const reconciler = new ClusterL4RouteReconciler('node-a', fake.binder);

        await reconciler.reconcile([route('r1', 'node-a'), route('r2', CLUSTER_L4_ROUTE_ANY)]);
        await reconciler.closeAll();

        expect(fake.closed.sort()).toEqual(['r1', 'r2']);
        expect(reconciler.activeCount()).toBe(0);
    });
});