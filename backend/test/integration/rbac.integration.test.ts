/**
 * RBAC runtime proof (epic 9.5.13) — exercises the RBAC migration, its
 * backward-compatible seed, the entity<->migration schema contract and LIVE
 * permission enforcement against a REAL MariaDB.
 *
 * Until now RBAC was only unit-tested with mocked data sources; this is the first
 * test that runs the `AddRbacTables` migration and the production DB services
 * (RbacDbDataSource + the rbac_* services + PermissionService) against a real
 * database, proving migration/seed/drift/enforce end to end.
 *
 * It is deliberately SELF-CONTAINED rather than going through the shared dbHarness:
 * in this workspace layout figtree is installed once PER package (not hoisted), so
 * the backend test's `DBHelper` and flyingfish_core's `DBService` would see two
 * different `DBHelper` singletons and `DBService.connect()` throws
 * "No DataSourceOptions found for 'default'". This harness instead builds a plain
 * TypeORM DataSource, runs the exact same entities + migrations, and points
 * flyingfish_core's `DBService` at it directly — the same seam `connect()` sets.
 *
 * Requires a running MariaDB (FF_TEST_DB_* env, localhost:13306/root/test default),
 * so it runs only in the dedicated integration job. See the CI integration job.
 */
import {DataSource, MigrationInterface} from 'typeorm';
import {
    DBEntitiesLoader,
    DBService,
    PermissionService,
    PluginManager,
    RbacDbDataSource
} from 'flyingfish_core';
import {AddAcmeDnsTempRecord1788400000000} from '../../src/inc/Db/MariaDb/migrations/1788400000000-AddAcmeDnsTempRecord.js';
import {AddDomainClusterPriority1788700000000} from '../../src/inc/Db/MariaDb/migrations/1788700000000-AddDomainClusterPriority.js';
import {AddPkiRevocation1788600000000} from '../../src/inc/Db/MariaDb/migrations/1788600000000-AddPkiRevocation.js';
import {AddPkiTables1788500000000} from '../../src/inc/Db/MariaDb/migrations/1788500000000-AddPkiTables.js';
import {AddRbacTables1788800000000} from '../../src/inc/Db/MariaDb/migrations/1788800000000-AddRbacTables.js';
import {InitialSchema1787961600000} from '../../src/inc/Db/MariaDb/migrations/1787961600000-InitialSchema.js';

const connectionOptions = (): {type: 'mysql'; host: string; port: number; username: string; password: string;} => ({
    type: 'mysql',
    host: process.env.FF_TEST_DB_HOST ?? '127.0.0.1',
    port: Number(process.env.FF_TEST_DB_PORT ?? 13306),
    username: process.env.FF_TEST_DB_USER ?? 'root',
    password: process.env.FF_TEST_DB_PASSWORD ?? 'test'
});

// The full production migration chain (mirrors backend DBLoader.loadMigrations).
const ALL_MIGRATIONS = [
    InitialSchema1787961600000,
    AddAcmeDnsTempRecord1788400000000,
    AddPkiTables1788500000000,
    AddPkiRevocation1788600000000,
    AddDomainClusterPriority1788700000000,
    AddRbacTables1788800000000
];

// The chain WITHOUT the RBAC migration — used to seed a pre-existing user before the
// RBAC migration runs, proving the "existing users become admin" backfill.
const MIGRATIONS_BEFORE_RBAC = ALL_MIGRATIONS.filter((migration) => migration !== AddRbacTables1788800000000);

/**
 * A TypeORM migration class (constructor implementing MigrationInterface).
 */
type MigrationClass = new () => MigrationInterface;

/**
 * Known-benign schema-diff no-ops the MariaDB schema builder always reports even
 * though the DDL is identical on both sides (kept in sync with the dbHarness drift
 * test): nullable TEXT columns produce a perpetual no-op CHANGE.
 */
const KNOWN_BENIGN = [
    'ALTER TABLE `ip_blacklist` CHANGE `description` `description` text NULL'
];

/**
 * (Re)create a database from scratch via a short-lived information_schema connection.
 */
const recreateDatabase = async(dbName: string): Promise<void> => {
    const bootstrap = new DataSource({...connectionOptions(), database: 'information_schema'});
    await bootstrap.initialize();
    await bootstrap.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await bootstrap.query(`CREATE DATABASE \`${dbName}\``);
    await bootstrap.destroy();
};

/**
 * Build + initialise a DataSource on a database and run the given migrations.
 */
const openWithMigrations = async(dbName: string, migrations: MigrationClass[]): Promise<DataSource> => {
    // PluginManager singleton is required by DBEntitiesLoader (no plugins => core entities only).
    // eslint-disable-next-line no-new -- constructor registers the PluginManager singleton
    new PluginManager('backend');
    const entities = await DBEntitiesLoader.loadEntities();

    const dataSource = new DataSource({
        ...connectionOptions(),
        database: dbName,
        entities: entities,
        migrations: migrations,
        migrationsRun: false,
        synchronize: false
    });

    await dataSource.initialize();
    await dataSource.runMigrations();

    return dataSource;
};

const dbName = (suffix: string): string => `${process.env.FF_TEST_DB_NAME ?? 'flyingfish'}_rbacproof_${suffix}`;

describe('RBAC migration + seed + enforce (integration, real MariaDB)', () => {
    const DB = dbName('main');
    let dataSource: DataSource;

    beforeAll(async() => {
        await recreateDatabase(DB);
        dataSource = await openWithMigrations(DB, ALL_MIGRATIONS);
        // Point flyingfish_core's DB services at this DataSource (the seam connect() sets),
        // so RbacDbDataSource + the rbac_* services run their real production queries.
        (DBService as unknown as {_source: DataSource;})._source = dataSource;
    });

    afterAll(async() => {
        (DBService as unknown as {_source: DataSource | null;})._source = null;

        if (dataSource?.isInitialized) {
            await dataSource.destroy();
        }
    });

    test('the RBAC migration creates all six rbac_* tables and records itself', async() => {
        const tables: {t: string;}[] = await dataSource.query(
            'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name LIKE \'rbac\\_%\''
        );
        const names = tables.map((row) => row.t).sort();

        expect(names).toEqual([
            'rbac_group',
            'rbac_permission',
            'rbac_role',
            'rbac_role_assignment',
            'rbac_role_permission',
            'rbac_user_group'
        ]);

        const applied = (await dataSource.query('SELECT name FROM migrations')).map((row: {name: string;}) => row.name);
        expect(applied).toContain('AddRbacTables1788800000000');
    });

    test('the seed installs the full-admin baseline (wildcard perm, superadmin role, Administrators group, global grant)', async() => {
        const [perm] = await dataSource.query('SELECT * FROM `rbac_permission` WHERE `permission_key` = \'*\'');
        expect(perm).toBeTruthy();

        const [role] = await dataSource.query('SELECT * FROM `rbac_role` WHERE `name` = \'superadmin\'');
        expect(role).toBeTruthy();

        const [group] = await dataSource.query('SELECT * FROM `rbac_group` WHERE `name` = \'Administrators\'');
        expect(group).toBeTruthy();
        expect(group.disable).toBe(0);

        // superadmin role holds the '*' permission
        const [rolePerm] = await dataSource.query(
            'SELECT * FROM `rbac_role_permission` WHERE `role_id` = ? AND `permission_id` = ?',
            [role.id, perm.id]
        );
        expect(rolePerm).toBeTruthy();

        // Administrators is granted superadmin GLOBALLY (empty resource scope)
        const [assignment] = await dataSource.query(
            'SELECT * FROM `rbac_role_assignment` WHERE `group_id` = ? AND `role_id` = ?',
            [group.id, role.id]
        );
        expect(assignment).toBeTruthy();
        expect(assignment.resource_type).toBe('');
        expect(assignment.resource_id).toBe(0);
    });

    test('entities match the migration-built schema (no unexpected drift, incl. rbac_* + domain.cluster_priority)', async() => {
        const sql = await dataSource.driver.createSchemaBuilder().log();

        const unexpected = sql.upQueries
        .map((query) => query.query)
        .filter((query) => !KNOWN_BENIGN.includes(query));

        expect(unexpected).toEqual([]);
    });

    test('LIVE enforce: a user in Administrators is granted any permission via the seeded superadmin wildcard', async() => {
        const [group] = await dataSource.query('SELECT id FROM `rbac_group` WHERE `name` = \'Administrators\'');
        const adminUserId = 4711;
        await dataSource.query('INSERT INTO `rbac_user_group` (`user_id`, `group_id`) VALUES (?, ?)', [adminUserId, group.id]);

        const permission = new PermissionService(new RbacDbDataSource());

        // wildcard covers an arbitrary permission, globally and on any resource
        expect(await permission.can(adminUserId, 'domain.write')).toBe(true);
        expect(await permission.can(adminUserId, 'user.manage')).toBe(true);
        expect(await permission.can(adminUserId, 'domain.write', {type: 'domain', id: 99})).toBe(true);

        // a user with no group membership is denied
        expect(await permission.can(9999, 'domain.write')).toBe(false);
    });

    test('LIVE enforce: a resource-scoped grant applies only to its exact resource', async() => {
        // Build a non-admin chain: domain.write permission -> editor role -> Editors group,
        // granted ONLY on domain id 5. Policy tables are UUID-keyed with no DB default, so
        // these raw inserts generate the id via UUID() (production saves generate it app-side).
        await dataSource.query('INSERT INTO `rbac_permission` (`id`, `permission_key`, `description`) VALUES (UUID(), \'domain.write\', \'Edit a domain\')');
        await dataSource.query('INSERT INTO `rbac_role` (`id`, `name`, `description`) VALUES (UUID(), \'editor\', \'Domain editor\')');
        await dataSource.query('INSERT INTO `rbac_group` (`id`, `name`, `description`, `disable`) VALUES (UUID(), \'Editors\', \'Scoped editors\', 0)');

        const [perm] = await dataSource.query('SELECT id FROM `rbac_permission` WHERE `permission_key` = \'domain.write\'');
        const [role] = await dataSource.query('SELECT id FROM `rbac_role` WHERE `name` = \'editor\'');
        const [group] = await dataSource.query('SELECT id FROM `rbac_group` WHERE `name` = \'Editors\'');

        await dataSource.query('INSERT INTO `rbac_role_permission` (`id`, `role_id`, `permission_id`) VALUES (UUID(), ?, ?)', [role.id, perm.id]);
        await dataSource.query(
            'INSERT INTO `rbac_role_assignment` (`id`, `group_id`, `role_id`, `resource_type`, `resource_id`) VALUES (UUID(), ?, ?, \'domain\', 5)',
            [group.id, role.id]
        );

        const editorUserId = 5001;
        await dataSource.query('INSERT INTO `rbac_user_group` (`user_id`, `group_id`) VALUES (?, ?)', [editorUserId, group.id]);

        const permission = new PermissionService(new RbacDbDataSource());

        // allowed on the exact scoped resource
        expect(await permission.can(editorUserId, 'domain.write', {type: 'domain', id: 5})).toBe(true);
        // denied on a different resource id, a different type, and on an unscoped check
        expect(await permission.can(editorUserId, 'domain.write', {type: 'domain', id: 6})).toBe(false);
        expect(await permission.can(editorUserId, 'domain.write', {type: 'ssl', id: 5})).toBe(false);
        expect(await permission.can(editorUserId, 'domain.write')).toBe(false);
        // a permission the role does not hold is denied even on the scoped resource
        expect(await permission.can(editorUserId, 'domain.delete', {type: 'domain', id: 5})).toBe(false);
    });
});

describe('RBAC migration backfill (integration, real MariaDB)', () => {
    const DB = dbName('backfill');

    afterAll(async() => {
        const bootstrap = new DataSource({...connectionOptions(), database: 'information_schema'});
        await bootstrap.initialize();
        await bootstrap.query(`DROP DATABASE IF EXISTS \`${DB}\``);
        await bootstrap.destroy();
    });

    test('an existing user is placed into Administrators with an effective wildcard when RBAC is added', async() => {
        // Bring the schema up to just BEFORE the RBAC migration and create a user that
        // predates RBAC.
        await recreateDatabase(DB);
        const before = await openWithMigrations(DB, MIGRATIONS_BEFORE_RBAC);
        await before.query(
            'INSERT INTO `user` (`username`, `password`, `email`, `disable`) VALUES (\'legacyadmin\', \'x\', \'a@b.c\', 0)'
        );
        const [user] = await before.query('SELECT id FROM `user` WHERE `username` = \'legacyadmin\'');
        await before.destroy();

        // Now apply the RBAC migration; its seed must backfill the existing user into Administrators.
        const after = await openWithMigrations(DB, ALL_MIGRATIONS);

        try {
            const [group] = await after.query('SELECT id FROM `rbac_group` WHERE `name` = \'Administrators\'');
            const [membership] = await after.query(
                'SELECT * FROM `rbac_user_group` WHERE `user_id` = ? AND `group_id` = ?',
                [user.id, group.id]
            );
            expect(membership).toBeTruthy();

            // And that membership resolves to the wildcard — the legacy user stays a full admin.
            // Point the services at THIS DataSource and drop the singletons cached against the
            // (now destroyed) main-suite DataSource so they rebind to `after`.
            (DBService as unknown as {_source: DataSource;})._source = after;
            (DBService as unknown as {_instance: Map<string, unknown>;})._instance.clear();
            const permission = new PermissionService(new RbacDbDataSource());
            expect(await permission.can(user.id, 'anything.at.all')).toBe(true);
        } finally {
            (DBService as unknown as {_source: DataSource | null;})._source = null;
            await after.destroy();
        }
    });
});