/**
 * Integration-test database harness.
 *
 * Connects to a MariaDB instance (configured via FF_TEST_DB_* env vars, with
 * localhost defaults), applies the TypeORM migrations, and offers helpers to
 * reset and close the connection. Requires a running MariaDB - used only by the
 * *.integration.test.ts files that run in the dedicated CI integration job.
 */
import {DBEntitiesLoader, DBHelper, PluginManager} from 'flyingfish_core';
import {InitialSchema1787961600000} from '../../src/inc/Db/MariaDb/migrations/1787961600000-InitialSchema.js';

let initialized = false;

/**
 * Initialise the test database: connect and run migrations.
 */
export const initTestDb = async(): Promise<void> => {
    if (initialized) {
        return;
    }

    // The constructor registers the singleton; with no plugins started,
    // DBEntitiesLoader.loadEntities() returns just the core entities.
    // eslint-disable-next-line no-new -- the constructor registers the PluginManager singleton used by loadEntities
    new PluginManager('backend');
    const entities = await DBEntitiesLoader.loadEntities();

    await DBHelper.init({
        type: 'mysql',
        host: process.env.FF_TEST_DB_HOST ?? '127.0.0.1',
        port: Number(process.env.FF_TEST_DB_PORT ?? 13306),
        username: process.env.FF_TEST_DB_USER ?? 'root',
        password: process.env.FF_TEST_DB_PASSWORD ?? 'test',
        database: process.env.FF_TEST_DB_NAME ?? 'flyingfish',
        entities: entities,
        migrations: [InitialSchema1787961600000],
        migrationsRun: false,
        synchronize: false
    });

    await DBHelper.runMigrations();
    // eslint-disable-next-line require-atomic-updates -- module-level init guard for tests, no real race
    initialized = true;
};

/**
 * Truncate all data tables (keeps the schema and the migrations record).
 */
export const resetTestDb = async(): Promise<void> => {
    const dataSource = DBHelper.getDataSource();

    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');

    const tables: {t: string;}[] = await dataSource.query(
        'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()'
    );

    for (const table of tables) {
        if (table.t !== 'migrations') {
            // eslint-disable-next-line no-await-in-loop -- truncate sequentially, order is irrelevant here
            await dataSource.query(`TRUNCATE TABLE \`${table.t}\``);
        }
    }

    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
};

/**
 * Close the test database connection.
 */
export const closeTestDb = async(): Promise<void> => {
    if (!initialized) {
        return;
    }

    await DBHelper.getDataSource().destroy();
    // eslint-disable-next-line require-atomic-updates -- module-level init guard for tests, no real race
    initialized = false;
};