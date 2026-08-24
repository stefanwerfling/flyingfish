/**
 * Integration test for the figtree migration path (refactoring phase 4 / figtree
 * adoption). In production, migrations are run by figtree's `MariaDBService`,
 * which now supports the auto-baseline via `DBHelper.runMigrations(name, baseline)`.
 * This guards that figtree code path - the sibling migration.integration.test.ts
 * covers the flyingfish_core DBHelper equivalent.
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {DBHelper as FigtreeDBHelper} from 'figtree';
import {DBEntitiesLoader, PluginManager} from 'flyingfish_core';
import {InitialSchema1787961600000} from '../../src/inc/Db/MariaDb/migrations/1787961600000-InitialSchema.js';
import {closeTestDb, getTestDbName, initTestDb} from './dbHarness.js';

const baseline = {
    legacyTable: 'user',
    migrationName: 'InitialSchema1787961600000',
    timestamp: 1787961600000
};

describe('figtree migration path (integration)', () => {
    beforeAll(async() => {
        // Ensure the schema exists (created via flyingfish_core DBHelper).
        await initTestDb();

        // figtree's DBHelper is a separate class/singleton from core's, so it
        // needs its own connection to the same test database.
        // eslint-disable-next-line no-new -- registers the PluginManager singleton used by loadEntities
        new PluginManager('backend');
        const entities = await DBEntitiesLoader.loadEntities();

        await FigtreeDBHelper.init({
            type: 'mysql',
            host: process.env.FF_TEST_DB_HOST ?? '127.0.0.1',
            port: Number(process.env.FF_TEST_DB_PORT ?? 13306),
            username: process.env.FF_TEST_DB_USER ?? 'root',
            password: process.env.FF_TEST_DB_PASSWORD ?? 'test',
            database: getTestDbName(),
            entities: entities,
            migrations: [InitialSchema1787961600000],
            migrationsRun: false,
            synchronize: false
        });
    });

    afterAll(async() => {
        await FigtreeDBHelper.closeAllSources();
        await closeTestDb();
    });

    test('figtree runMigrations auto-baselines a legacy schema (no re-run)', async() => {
        const dataSource = await FigtreeDBHelper.getDataSource();

        // Simulate a v1.1.x install: the schema exists but the migrations table is gone.
        await dataSource.query('DROP TABLE IF EXISTS `migrations`');

        // Would throw (CREATE TABLE ... already exists) if the baseline did not stamp.
        await FigtreeDBHelper.runMigrations(undefined, baseline);

        const applied = (await dataSource.query('SELECT name FROM migrations')).map((row: {name: string;}) => row.name);
        expect(applied).toContain('InitialSchema1787961600000');
    });

    test('figtree runMigrations is a clean no-op when already baselined', async() => {
        const dataSource = await FigtreeDBHelper.getDataSource();

        await FigtreeDBHelper.runMigrations(undefined, baseline);

        const rows = await dataSource.query('SELECT name FROM migrations WHERE name = ?', ['InitialSchema1787961600000']);
        expect(rows.length).toBe(1);
    });
});