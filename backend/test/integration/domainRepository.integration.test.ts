/**
 * Integration test for the DB service/entity layer against a real MariaDB.
 * Verifies the entity mapping and the DBService round-trip via the harness.
 */
import {DomainDB, DomainServiceDB} from 'flyingfish_core';
import {closeTestDb, initTestDb, resetTestDb} from './dbHarness.js';

describe('Domain repository (integration)', () => {
    beforeAll(initTestDb);
    afterEach(resetTestDb);
    afterAll(closeTestDb);

    test('saves and reads back a domain', async() => {
        const service = DomainServiceDB.getInstance();

        const domain = new DomainDB();
        domain.domainname = 'example.com';

        const saved = await service.save(domain);
        expect(saved.id).toBeGreaterThan(0);

        const found = await service.findOne(saved.id);
        expect(found).not.toBeNull();
        expect(found?.domainname).toBe('example.com');
        expect(await service.countAll()).toBe(1);
    });

    test('resetTestDb truncates data between tests', async() => {
        // The row from the previous test must be gone.
        expect(await DomainServiceDB.getInstance().countAll()).toBe(0);
    });
});