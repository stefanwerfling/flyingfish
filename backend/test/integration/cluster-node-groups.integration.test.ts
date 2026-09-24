/**
 * Cluster node-groups runtime proof (Cluster/Mesh epic 9.5.12.3/.4) — exercises the
 * AddClusterNodeGroups + AddClusterNodeGroupShares migrations, the entity<->migration
 * schema contract, the ClusterNodeGroupManager CRUD (create/edit/membership/share/delete),
 * and the ClusterNodeGroupConverger upsert against a REAL MariaDB.
 *
 * Self-contained (same rationale as rbac.integration.test.ts): builds a plain TypeORM
 * DataSource with the exact production entities + migrations and points flyingfish_core's
 * DBService at it, so the production DB services run their real queries.
 *
 * Requires a running MariaDB (FF_TEST_DB_* env, localhost:13306/root/test default), so it
 * runs only in the dedicated integration job.
 */
import {DataSource, MigrationInterface} from 'typeorm';
import {
    ClusterNodeGroupMemberServiceDB,
    ClusterNodeGroupServiceDB,
    ClusterNodeGroupShareServiceDB,
    DBEntitiesLoader,
    DBService,
    PluginManager
} from 'flyingfish_core';
import {ClusterNodeGroupConverger} from '../../src/Application/Hub/ClusterNodeGroupConverger.js';
import {ClusterNodeGroupManager} from '../../src/Application/Hub/ClusterNodeGroupManager.js';
import {AddAcmeDnsTempRecord1788400000000} from '../../src/inc/Db/MariaDb/migrations/1788400000000-AddAcmeDnsTempRecord.js';
import {AddDomainClusterPriority1788700000000} from '../../src/inc/Db/MariaDb/migrations/1788700000000-AddDomainClusterPriority.js';
import {AddPkiRevocation1788600000000} from '../../src/inc/Db/MariaDb/migrations/1788600000000-AddPkiRevocation.js';
import {AddPkiTables1788500000000} from '../../src/inc/Db/MariaDb/migrations/1788500000000-AddPkiTables.js';
import {AddRbacTables1788800000000} from '../../src/inc/Db/MariaDb/migrations/1788800000000-AddRbacTables.js';
import {AddRouterTables1788900000000} from '../../src/inc/Db/MariaDb/migrations/1788900000000-AddRouterTables.js';
import {AddWanLease1789000000000} from '../../src/inc/Db/MariaDb/migrations/1789000000000-AddWanLease.js';
import {AddDhcpPerInterface1789100000000} from '../../src/inc/Db/MariaDb/migrations/1789100000000-AddDhcpPerInterface.js';
import {FixPkiTimestampsBigint1789200000000} from '../../src/inc/Db/MariaDb/migrations/1789200000000-FixPkiTimestampsBigint.js';
import {AddNatPerInterface1789300000000} from '../../src/inc/Db/MariaDb/migrations/1789300000000-AddNatPerInterface.js';
import {AddPortForward1789400000000} from '../../src/inc/Db/MariaDb/migrations/1789400000000-AddPortForward.js';
import {AddSystemConfig1789500000000} from '../../src/inc/Db/MariaDb/migrations/1789500000000-AddSystemConfig.js';
import {AddDomainRecordFollowNode1789600000000} from '../../src/inc/Db/MariaDb/migrations/1789600000000-AddDomainRecordFollowNode.js';
import {AddDhcpRaParams1789700000000} from '../../src/inc/Db/MariaDb/migrations/1789700000000-AddDhcpRaParams.js';
import {AddClusterNodeGroups1789800000000} from '../../src/inc/Db/MariaDb/migrations/1789800000000-AddClusterNodeGroups.js';
import {AddClusterNodeGroupShares1789900000000} from '../../src/inc/Db/MariaDb/migrations/1789900000000-AddClusterNodeGroupShares.js';
import {InitialSchema1787961600000} from '../../src/inc/Db/MariaDb/migrations/1787961600000-InitialSchema.js';

const connectionOptions = (): {type: 'mysql'; host: string; port: number; username: string; password: string;} => ({
    type: 'mysql',
    host: process.env.FF_TEST_DB_HOST ?? '127.0.0.1',
    port: Number(process.env.FF_TEST_DB_PORT ?? 13306),
    username: process.env.FF_TEST_DB_USER ?? 'root',
    password: process.env.FF_TEST_DB_PASSWORD ?? 'test'
});

// The full production migration chain (mirrors backend DBLoader.loadMigrations).
const ALL_MIGRATIONS: (new () => MigrationInterface)[] = [
    InitialSchema1787961600000,
    AddAcmeDnsTempRecord1788400000000,
    AddPkiTables1788500000000,
    AddPkiRevocation1788600000000,
    AddDomainClusterPriority1788700000000,
    AddRbacTables1788800000000,
    AddRouterTables1788900000000,
    AddWanLease1789000000000,
    AddDhcpPerInterface1789100000000,
    FixPkiTimestampsBigint1789200000000,
    AddNatPerInterface1789300000000,
    AddPortForward1789400000000,
    AddSystemConfig1789500000000,
    AddDomainRecordFollowNode1789600000000,
    AddDhcpRaParams1789700000000,
    AddClusterNodeGroups1789800000000,
    AddClusterNodeGroupShares1789900000000
];

/**
 * Known-benign schema-diff no-ops the MariaDB schema builder always reports even though
 * the DDL is identical on both sides (kept in sync with the dbHarness drift test).
 */
const KNOWN_BENIGN = [
    'ALTER TABLE `ip_blacklist` CHANGE `description` `description` text NULL'
];

const recreateDatabase = async(dbName: string): Promise<void> => {
    const bootstrap = new DataSource({...connectionOptions(), database: 'information_schema'});
    await bootstrap.initialize();
    await bootstrap.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await bootstrap.query(`CREATE DATABASE \`${dbName}\``);
    await bootstrap.destroy();
};

const openWithMigrations = async(dbName: string, migrations: (new () => MigrationInterface)[]): Promise<DataSource> => {
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

const dbName = `${process.env.FF_TEST_DB_NAME ?? 'flyingfish'}_nodegroups`;

describe('cluster node-groups migration + manager + converge (integration, real MariaDB)', () => {
    let dataSource: DataSource;

    beforeAll(async() => {
        await recreateDatabase(dbName);
        dataSource = await openWithMigrations(dbName, ALL_MIGRATIONS);
        (DBService as unknown as {_source: DataSource;})._source = dataSource;
    });

    afterAll(async() => {
        (DBService as unknown as {_source: DataSource | null;})._source = null;
        (DBService as unknown as {_instance: Map<string, unknown>;})._instance.clear();

        if (dataSource?.isInitialized) {
            await dataSource.destroy();
        }
    });

    test('the migrations create all cluster_node_group* tables and record themselves', async() => {
        const tables: {t: string;}[] = await dataSource.query(
            'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name LIKE \'cluster\\_node\\_group%\''
        );
        expect(tables.map((row) => row.t).sort()).toEqual(['cluster_node_group', 'cluster_node_group_member', 'cluster_node_group_share']);

        const applied = (await dataSource.query('SELECT name FROM migrations')).map((row: {name: string;}) => row.name);
        expect(applied).toContain('AddClusterNodeGroups1789800000000');
        expect(applied).toContain('AddClusterNodeGroupShares1789900000000');
    });

    test('entities match the migration-built schema (no unexpected drift)', async() => {
        const sql = await dataSource.driver.createSchemaBuilder().log();
        const unexpected = sql.upQueries.map((query) => query.query).filter((query) => !KNOWN_BENIGN.includes(query));

        expect(unexpected).toEqual([]);
    });

    test('manager: create -> edit a group generates + keeps a stable UUID id', async() => {
        const manager = new ClusterNodeGroupManager();

        const id = await manager.saveGroup({name: 'Home LAN', description: 'trusted', color: '#12919f'});
        expect(id).toMatch(/^[0-9a-f-]{36}$/u);

        const [created] = await dataSource.query('SELECT * FROM `cluster_node_group` WHERE `id` = ?', [id]);
        expect(created).toMatchObject({name: 'Home LAN', description: 'trusted', color: '#12919f'});

        // editing by id updates in place (no new row)
        const sameId = await manager.saveGroup({id: id, name: 'Home', description: '', color: '#2f7dd1'});
        expect(sameId).toBe(id);

        const rows = await dataSource.query('SELECT * FROM `cluster_node_group` WHERE `id` = ?', [id]);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({name: 'Home', description: '', color: '#2f7dd1'});
    });

    test('manager: membership add is idempotent, remove deletes, and delete cascades memberships', async() => {
        const manager = new ClusterNodeGroupManager();
        const groupId = await manager.saveGroup({name: 'Routers', color: '#a855c9'});

        // add twice -> exactly one membership row (idempotent)
        await manager.setMembership('node-a', groupId, true);
        await manager.setMembership('node-a', groupId, true);
        let members = await dataSource.query('SELECT * FROM `cluster_node_group_member` WHERE `group_uuid` = ?', [groupId]);
        expect(members).toHaveLength(1);
        expect(members[0]).toMatchObject({node_uid: 'node-a', group_uuid: groupId});

        // a second node joins, then node-a leaves
        await manager.setMembership('node-b', groupId, true);
        await manager.setMembership('node-a', groupId, false);
        members = await dataSource.query('SELECT node_uid FROM `cluster_node_group_member` WHERE `group_uuid` = ?', [groupId]);
        expect(members.map((row: {node_uid: string;}) => row.node_uid)).toEqual(['node-b']);

        // removing an absent membership is a no-op
        await manager.setMembership('node-a', groupId, false);
        const [{c}] = await dataSource.query('SELECT COUNT(*) AS c FROM `cluster_node_group_member` WHERE `group_uuid` = ?', [groupId]);
        expect(Number(c)).toBe(1);

        // deleting the group also removes its memberships (no dangling rows)
        await manager.deleteGroup(groupId);
        expect(await dataSource.query('SELECT * FROM `cluster_node_group` WHERE `id` = ?', [groupId])).toEqual([]);
        expect(await dataSource.query('SELECT * FROM `cluster_node_group_member` WHERE `group_uuid` = ?', [groupId])).toEqual([]);
    });

    test('manager: setShare upserts by (node, group, resourceType), removeShare deletes, delete cascades shares', async() => {
        const manager = new ClusterNodeGroupManager();
        const groupId = await manager.saveGroup({name: 'Shared Zone', color: '#12919f'});

        // setting a share twice with a different level UPDATES in place (no duplicate row)
        await manager.setShare('node-a', groupId, 'domain', 'read');
        await manager.setShare('node-a', groupId, 'domain', 'write');
        let shares = await dataSource.query(
            'SELECT * FROM `cluster_node_group_share` WHERE `group_uuid` = ? AND `node_uid` = ? AND `resource_type` = ?',
            [groupId, 'node-a', 'domain']
        );
        expect(shares).toHaveLength(1);
        expect(shares[0]).toMatchObject({node_uid: 'node-a', group_uuid: groupId, resource_type: 'domain', level: 'write'});

        // a distinct resource type from the same node is a separate row
        await manager.setShare('node-a', groupId, 'route', 'read');
        shares = await dataSource.query('SELECT resource_type FROM `cluster_node_group_share` WHERE `group_uuid` = ?', [groupId]);
        expect(shares.map((row: {resource_type: string;}) => row.resource_type).sort()).toEqual(['domain', 'route']);

        // removing a share is a no-op for an absent rule, and deletes an existing one
        await manager.removeShare('node-a', groupId, 'ssh');
        await manager.removeShare('node-a', groupId, 'route');
        shares = await dataSource.query('SELECT resource_type FROM `cluster_node_group_share` WHERE `group_uuid` = ?', [groupId]);
        expect(shares.map((row: {resource_type: string;}) => row.resource_type)).toEqual(['domain']);

        // deleting the group also removes its sharing rules (no dangling rows)
        await manager.deleteGroup(groupId);
        expect(await dataSource.query('SELECT * FROM `cluster_node_group_share` WHERE `group_uuid` = ?', [groupId])).toEqual([]);
    });

    test('convergence: a gossiped node-group view upserts into the local DB (create then update, no dup)', async() => {
        const converger = new ClusterNodeGroupConverger();

        await converger.import({
            groups: [{id: 'conv-ng1', name: 'RemoteZone', description: 'from node B', color: '#1f9d63'}],
            members: [{id: 'conv-ngm1', nodeUid: 'node-x', groupUuid: 'conv-ng1'}],
            shares: [{id: 'conv-ngs1', nodeUid: 'node-x', groupUuid: 'conv-ng1', resourceType: 'domain', level: 'read'}]
        });

        const [group] = await dataSource.query('SELECT * FROM `cluster_node_group` WHERE `id` = ?', ['conv-ng1']);
        expect(group).toMatchObject({name: 'RemoteZone', color: '#1f9d63'});
        const [member] = await dataSource.query('SELECT * FROM `cluster_node_group_member` WHERE `id` = ?', ['conv-ngm1']);
        expect(member).toMatchObject({node_uid: 'node-x', group_uuid: 'conv-ng1'});
        const [share] = await dataSource.query('SELECT * FROM `cluster_node_group_share` WHERE `id` = ?', ['conv-ngs1']);
        expect(share).toMatchObject({node_uid: 'node-x', group_uuid: 'conv-ng1', resource_type: 'domain', level: 'read'});

        // re-importing the same UUIDs with changed fields UPSERTS (no duplicate rows)
        await converger.import({
            groups: [{id: 'conv-ng1', name: 'Renamed', description: 'x', color: '#c9871b'}],
            members: [],
            shares: [{id: 'conv-ngs1', nodeUid: 'node-x', groupUuid: 'conv-ng1', resourceType: 'domain', level: 'write'}]
        });
        const groups = await dataSource.query('SELECT * FROM `cluster_node_group` WHERE `id` = ?', ['conv-ng1']);
        expect(groups).toHaveLength(1);
        expect(groups[0].name).toBe('Renamed');
        const shares = await dataSource.query('SELECT * FROM `cluster_node_group_share` WHERE `id` = ?', ['conv-ngs1']);
        expect(shares).toHaveLength(1);
        expect(shares[0].level).toBe('write');
    });

    test('the services read back what the manager wrote', async() => {
        // sanity: the production service singletons resolve against this DataSource
        const groupCountBefore = (await ClusterNodeGroupServiceDB.getInstance().findAll()).length;
        const id = await new ClusterNodeGroupManager().saveGroup({name: 'Edge', color: '#a855c9'});
        expect((await ClusterNodeGroupServiceDB.getInstance().findAll()).length).toBe(groupCountBefore + 1);

        await new ClusterNodeGroupManager().setMembership('node-z', id, true);
        const members = await ClusterNodeGroupMemberServiceDB.getInstance().findAll();
        expect(members.some((member) => member.node_uid === 'node-z' && member.group_uuid === id)).toBe(true);

        await new ClusterNodeGroupManager().setShare('node-z', id, 'domain', 'read');
        const shares = await ClusterNodeGroupShareServiceDB.getInstance().findAll();
        expect(shares.some((share) => share.node_uid === 'node-z' && share.group_uuid === id && share.resource_type === 'domain')).toBe(true);
    });
});