/**
 * Schema contract test (refactoring phase 1, step 2.3).
 *
 * Now that synchronize:true is off and the schema is owned by TypeORM
 * migrations, an entity can silently drift from the migration-built schema
 * (e.g. a new @Column added to an entity without a matching migration). This
 * test guards that contract: after the migrations run, TypeORM's schema diff
 * between the entity metadata and the actual database must be empty - i.e. the
 * entities and the migrations agree.
 *
 * Runs against a real MariaDB via the dbHarness - see the CI integration job.
 */
import {DBHelper} from 'flyingfish_core';
import {closeTestDb, initTestDb} from './dbHarness.js';

/**
 * Known-benign diffs that TypeORM's MariaDB schema builder always reports even
 * though the DDL is identical on both sides (no real drift). Any query NOT in
 * this list is treated as real drift and fails the test.
 *
 * - Nullable TEXT columns: MariaDB/TypeORM produce a perpetual no-op
 *   `CHANGE ... text NULL` for every nullable TEXT column (the column type
 *   carries no comparable default/length), so the diff never fully clears.
 *   `ip_blacklist.description` is the only nullable TEXT column in the schema.
 */
const KNOWN_BENIGN = [
    'ALTER TABLE `ip_blacklist` CHANGE `description` `description` text NULL'
];

describe('entity <-> migration schema drift (integration)', () => {
    beforeAll(initTestDb);
    afterAll(closeTestDb);

    test('entities match the migration-built schema (no unexpected drift)', async() => {
        const dataSource = DBHelper.getDataSource();

        // The schema builder computes the DDL that would be needed to bring the
        // database in line with the entity metadata. Empty (modulo known-benign
        // no-ops) means entities and migrations agree.
        const sql = await dataSource.driver.createSchemaBuilder().log();

        const unexpected = sql.upQueries
        .map((query) => query.query)
        .filter((query) => !KNOWN_BENIGN.includes(query));

        expect(unexpected).toEqual([]);
    });
});