/**
 * Pi-router schema runtime proof (Pi-router epic, Phase 1) — runs the full migration
 * chain incl. AddRouterTables against a REAL MariaDB and verifies the four router
 * tables are created and that the entities agree with the migration-built schema (no
 * drift). Self-contained (own DataSource) for the same figtree-duplication reason as
 * rbac.integration.test.ts. Requires a MariaDB (FF_TEST_DB_*, integration job).
 */
import {DataSource, MigrationInterface} from 'typeorm';
import {DBEntitiesLoader, PluginManager} from 'flyingfish_core';
import {AddAcmeDnsTempRecord1788400000000} from '../../src/inc/Db/MariaDb/migrations/1788400000000-AddAcmeDnsTempRecord.js';
import {AddDomainClusterPriority1788700000000} from '../../src/inc/Db/MariaDb/migrations/1788700000000-AddDomainClusterPriority.js';
import {AddPkiRevocation1788600000000} from '../../src/inc/Db/MariaDb/migrations/1788600000000-AddPkiRevocation.js';
import {AddPkiTables1788500000000} from '../../src/inc/Db/MariaDb/migrations/1788500000000-AddPkiTables.js';
import {AddRbacTables1788800000000} from '../../src/inc/Db/MariaDb/migrations/1788800000000-AddRbacTables.js';
import {AddRouterTables1788900000000} from '../../src/inc/Db/MariaDb/migrations/1788900000000-AddRouterTables.js';
import {InitialSchema1787961600000} from '../../src/inc/Db/MariaDb/migrations/1787961600000-InitialSchema.js';

const connectionOptions = (): {type: 'mysql'; host: string; port: number; username: string; password: string;} => ({
    type: 'mysql',
    host: process.env.FF_TEST_DB_HOST ?? '127.0.0.1',
    port: Number(process.env.FF_TEST_DB_PORT ?? 13306),
    username: process.env.FF_TEST_DB_USER ?? 'root',
    password: process.env.FF_TEST_DB_PASSWORD ?? 'test'
});

const ALL_MIGRATIONS: (new () => MigrationInterface)[] = [
    InitialSchema1787961600000,
    AddAcmeDnsTempRecord1788400000000,
    AddPkiTables1788500000000,
    AddPkiRevocation1788600000000,
    AddDomainClusterPriority1788700000000,
    AddRbacTables1788800000000,
    AddRouterTables1788900000000
];

const KNOWN_BENIGN = [
    'ALTER TABLE `ip_blacklist` CHANGE `description` `description` text NULL'
];

const DB = `${process.env.FF_TEST_DB_NAME ?? 'flyingfish'}_routerproof`;

describe('Pi-router schema (integration, real MariaDB)', () => {
    let dataSource: DataSource;

    beforeAll(async() => {
        const bootstrap = new DataSource({...connectionOptions(), database: 'information_schema'});
        await bootstrap.initialize();
        await bootstrap.query(`DROP DATABASE IF EXISTS \`${DB}\``);
        await bootstrap.query(`CREATE DATABASE \`${DB}\``);
        await bootstrap.destroy();

        // eslint-disable-next-line no-new -- registers the PluginManager singleton used by loadEntities
        new PluginManager('backend');
        dataSource = new DataSource({
            ...connectionOptions(),
            database: DB,
            entities: await DBEntitiesLoader.loadEntities(),
            migrations: ALL_MIGRATIONS,
            migrationsRun: false,
            synchronize: false
        });
        await dataSource.initialize();
        await dataSource.runMigrations();
    });

    afterAll(async() => {
        if (dataSource?.isInitialized) {
            await dataSource.destroy();
        }
    });

    test('the router migration creates the four router tables and records itself', async() => {
        const tables: {t: string;}[] = await dataSource.query(
            'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (\'network_interface\',\'nat_policy\',\'dhcp_server_config\',\'dhcp_lease\')'
        );
        expect(tables.map((row) => row.t).sort()).toEqual(['dhcp_lease', 'dhcp_server_config', 'nat_policy', 'network_interface']);

        const applied = (await dataSource.query('SELECT name FROM migrations')).map((row: {name: string;}) => row.name);
        expect(applied).toContain('AddRouterTables1788900000000');
    });

    test('the router entities match the migration-built schema (no unexpected drift)', async() => {
        const sql = await dataSource.driver.createSchemaBuilder().log();

        const unexpected = sql.upQueries
        .map((query) => query.query)
        .filter((query) => !KNOWN_BENIGN.includes(query));

        expect(unexpected).toEqual([]);
    });
});