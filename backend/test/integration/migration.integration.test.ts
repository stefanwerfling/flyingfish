/**
 * Integration tests for the TypeORM migration setup (refactoring phase 4).
 * Run against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {DBHelper} from 'figtree';
import {closeTestDb, initTestDb} from './dbHarness.js';

describe('DB migrations (integration)', () => {
    beforeAll(initTestDb);
    afterAll(closeTestDb);

    test('the initial migration creates the full schema and is recorded', async() => {
        const dataSource = await DBHelper.getDataSource();

        const tableCount = Number((await dataSource.query(
            'SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE()'
        ))[0].c);
        expect(tableCount).toBeGreaterThanOrEqual(29);

        const userTable = await dataSource.query('SHOW TABLES LIKE \'user\'');
        expect(userTable.length).toBe(1);

        const applied = (await dataSource.query('SELECT name FROM migrations')).map((row: {name: string;}) => row.name);
        expect(applied).toContain('InitialSchema1787961600000');
    });

    test('auto-baseline stamps the initial migration on a legacy schema (no re-run)', async() => {
        const dataSource = await DBHelper.getDataSource();

        // Simulate a legacy install: the schema exists but the migrations table is gone.
        await dataSource.query('DROP TABLE `migrations`');

        // Would throw (CREATE TABLE ... already exists) if the baseline did not stamp.
        await DBHelper.runMigrations(undefined, {
            legacyTable: 'user',
            migrationName: 'InitialSchema1787961600000',
            timestamp: 1787961600000
        });

        const applied = (await dataSource.query('SELECT name FROM migrations')).map((row: {name: string;}) => row.name);
        expect(applied).toContain('InitialSchema1787961600000');
    });
});