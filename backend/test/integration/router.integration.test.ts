/**
 * Pi-router schema runtime proof (Pi-router epic, Phase 1) — runs the full migration
 * chain incl. AddRouterTables against a REAL MariaDB and verifies the four router
 * tables are created and that the entities agree with the migration-built schema (no
 * drift). Self-contained (own DataSource) for the same figtree-duplication reason as
 * rbac.integration.test.ts. Requires a MariaDB (FF_TEST_DB_*, integration job).
 */
import {DataSource, MigrationInterface} from 'typeorm';
import {
    DBEntitiesLoader,
    DBService,
    DhcpServerConfigDB,
    DhcpServerConfigServiceDB,
    NatPolicyDB,
    NatPolicyServiceDB,
    NetworkInterfaceDB,
    NetworkInterfaceServiceDB,
    PluginManager,
    WanLeaseDB,
    WanLeaseServiceDB
} from 'flyingfish_core';
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
    AddRouterTables1788900000000,
    AddWanLease1789000000000,
    AddDhcpPerInterface1789100000000,
    FixPkiTimestampsBigint1789200000000,
    AddNatPerInterface1789300000000,
    AddPortForward1789400000000
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
        // Point flyingfish_core's DB services at this DataSource so the router services run
        // their real production queries (same seam DBService.connect() sets).
        (DBService as unknown as {_source: DataSource;})._source = dataSource;
    });

    afterAll(async() => {
        (DBService as unknown as {_source: DataSource | null;})._source = null;

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

        const wanLeaseTable = await dataSource.query('SHOW TABLES LIKE \'wan_lease\'');
        expect(wanLeaseTable.length).toBe(1);
        expect(applied).toContain('AddWanLease1789000000000');
    });

    test('the router entities match the migration-built schema (no unexpected drift)', async() => {
        const sql = await dataSource.driver.createSchemaBuilder().log();

        const unexpected = sql.upQueries
        .map((query) => query.query)
        .filter((query) => !KNOWN_BENIGN.includes(query));

        expect(unexpected).toEqual([]);
    });

    test('CRUD round-trip via the production services (interfaces by role/mac; singleton NAT/DHCP)', async() => {
        // interfaces: create a WAN + a LAN, look them up by role and by MAC
        const wan = new NetworkInterfaceDB();
        wan.mac_address = 'aa:bb:cc:00:00:01';
        wan.name = 'eth0';
        wan.role = 'wan';
        wan.ipv4_mode = 'dhcp';
        await NetworkInterfaceServiceDB.getInstance().save(wan);

        const lan = new NetworkInterfaceDB();
        lan.mac_address = 'aa:bb:cc:00:00:02';
        lan.name = 'eth1';
        lan.role = 'lan';
        lan.ipv4_mode = 'static';
        lan.ipv4_address = '192.168.1.1';
        lan.ipv4_prefix = 24;
        await NetworkInterfaceServiceDB.getInstance().save(lan);

        const wans = await NetworkInterfaceServiceDB.getInstance().findByRole('wan');
        expect(wans.map((entry) => entry.mac_address)).toEqual(['aa:bb:cc:00:00:01']);

        const byMac = await NetworkInterfaceServiceDB.getInstance().findByMac('aa:bb:cc:00:00:02');
        expect(byMac?.role).toBe('lan');
        expect(byMac?.ipv4_address).toBe('192.168.1.1');
        expect(byMac?.ipv4_prefix).toBe(24);

        // nat policy: singleton — get() null before, one row after repeated saves
        expect(await NatPolicyServiceDB.getInstance().get()).toBeNull();
        const nat = new NatPolicyDB();
        nat.nat44_enabled = true;
        nat.ipv6_mode = 'nat66';
        nat.forward_enabled = true;
        await NatPolicyServiceDB.getInstance().save(nat);

        const savedNat = await NatPolicyServiceDB.getInstance().get();
        expect(savedNat?.nat44_enabled).toBe(true);
        expect(savedNat?.ipv6_mode).toBe('nat66');

        // update the same singleton row (not a second row)
        savedNat!.ipv6_mode = 'pd';
        await NatPolicyServiceDB.getInstance().save(savedNat!);
        expect(await NatPolicyServiceDB.getInstance().countAll()).toBe(1);
        expect((await NatPolicyServiceDB.getInstance().get())?.ipv6_mode).toBe('pd');

        // dhcp config: singleton
        const dhcp = new DhcpServerConfigDB();
        dhcp.enable = true;
        dhcp.range_start = '192.168.1.100';
        dhcp.range_end = '192.168.1.200';
        dhcp.gateway = '192.168.1.1';
        dhcp.dns_server = '192.168.1.1';
        await DhcpServerConfigServiceDB.getInstance().save(dhcp);

        const savedDhcp = await DhcpServerConfigServiceDB.getInstance().get();
        expect(savedDhcp?.enable).toBe(true);
        expect(savedDhcp?.range_end).toBe('192.168.1.200');
        expect(savedDhcp?.lease_time).toBe(3600);

        // wan lease: singleton report, upserted (as ff-wan would report)
        expect(await WanLeaseServiceDB.getInstance().get()).toBeNull();
        const lease = new WanLeaseDB();
        lease.interface = 'eth0';
        lease.ipv4_address = '203.0.113.10';
        lease.ipv4_prefix = 24;
        lease.gateway = '203.0.113.1';
        lease.dns_servers = '203.0.113.1,8.8.8.8';
        lease.ipv6_prefix = '2003:dead:beef::/64';
        lease.lease_seconds = 86400;
        lease.obtained = 1000;
        await WanLeaseServiceDB.getInstance().save(lease);

        const savedLease = await WanLeaseServiceDB.getInstance().get();
        expect(savedLease?.ipv4_address).toBe('203.0.113.10');
        expect(savedLease?.ipv6_prefix).toBe('2003:dead:beef::/64');

        // re-report keeps a single row
        savedLease!.ipv4_address = '203.0.113.11';
        await WanLeaseServiceDB.getInstance().save(savedLease!);
        expect(await WanLeaseServiceDB.getInstance().countAll()).toBe(1);
        expect((await WanLeaseServiceDB.getInstance().get())?.ipv4_address).toBe('203.0.113.11');
    });
});