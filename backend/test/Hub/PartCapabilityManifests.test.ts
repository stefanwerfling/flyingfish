/**
 * Set-level tests over ALL part capability manifests.
 *
 * These guard the cross-manifest invariants the per-part suites cannot: the Hub
 * aggregates menus/pages from every registered part (HubRegistry.uiContributions
 * sorts the menu by `order`), so part ids, menu ids, menu orders and page routes
 * must not collide across parts, and every page must reference an existing menu.
 * Network-free (pure schema/collection checks).
 */
import {SchemaCapabilityManifest} from 'flyingfish_schemas';
import {HubRegistry} from '../../src/Application/Hub/HubRegistry.js';
import {
    COLOCATED_PART_IDS,
    buildAllPartCapabilityManifests,
    partCapabilityManifestBuilders,
    registerColocatedParts
} from '../../src/Application/Hub/PartCapabilityManifests.js';

describe('Part capability manifests (set-level invariants)', () => {
    const manifests = buildAllPartCapabilityManifests('test');

    test('every part manifest validates against the schema', () => {
        for (const manifest of manifests) {
            const errors: unknown[] = [];

            expect(SchemaCapabilityManifest.validate(manifest, errors)).toBe(true);
            expect(errors).toEqual([]);
        }
    });

    test('the index key matches each manifest part id', () => {
        for (const [key, build] of Object.entries(partCapabilityManifestBuilders)) {
            expect(build(`x-${key}`).part.id).toBe(key);
        }
    });

    test('part ids are unique', () => {
        const ids = manifests.map((m) => m.part.id);

        expect(new Set(ids).size).toBe(ids.length);
    });

    test('menu ids and menu orders do not collide across parts', () => {
        const menus = manifests.flatMap((m) => m.capabilities.flatMap((c) => c.ui?.menu ?? []));
        const ids = menus.map((e) => e.id);
        const orders = menus.map((e) => e.order);

        expect(new Set(ids).size).toBe(ids.length);
        expect(new Set(orders).size).toBe(orders.length);
    });

    test('page routes are unique and every page references an existing menu', () => {
        const menuIds = new Set(
            manifests.flatMap((m) => m.capabilities.flatMap((c) => (c.ui?.menu ?? []).map((e) => e.id)))
        );
        const pages = manifests.flatMap((m) => m.capabilities.flatMap((c) => c.ui?.pages ?? []));
        const routes = pages.map((p) => p.route);

        expect(new Set(routes).size).toBe(routes.length);

        for (const page of pages) {
            expect(menuIds.has(page.menuId)).toBe(true);
        }
    });

    test('registerColocatedParts registers the in-process parts into a registry', () => {
        const registry = new HubRegistry();

        registerColocatedParts(registry, 'test');

        expect(registry.list()).toHaveLength(COLOCATED_PART_IDS.length);

        for (const id of COLOCATED_PART_IDS) {
            const part = registry.get(`${id}@test`);

            expect(part).toBeDefined();
            expect(part?.manifest.part.id).toBe(id);
        }
    });
});