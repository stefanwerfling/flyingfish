import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Add the WAN lease table (Pi-router epic, Phase 3): `wan_lease` is the read model of
 * the DHCP lease the WAN interface holds, reported by `ff-wan` (IPv4 address/gateway/DNS
 * + any delegated IPv6-PD prefix). Node-LOCAL, no seed. Appended after AddRouterTables.
 */
export class AddWanLease1789000000000 implements MigrationInterface {

    public name = 'AddWanLease1789000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `wan_lease` (`id` int NOT NULL AUTO_INCREMENT, `interface` varchar(64) NOT NULL DEFAULT '', `ipv4_address` varchar(64) NOT NULL DEFAULT '', `ipv4_prefix` int NOT NULL DEFAULT '0', `gateway` varchar(64) NOT NULL DEFAULT '', `dns_servers` varchar(255) NOT NULL DEFAULT '', `ipv6_prefix` varchar(64) NOT NULL DEFAULT '', `lease_seconds` int NOT NULL DEFAULT '0', `obtained` int NOT NULL DEFAULT '0', PRIMARY KEY (`id`)) ENGINE=InnoDB");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE `wan_lease`");
    }

}
