import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Add the Pi-router tables (Pi-router epic): `network_interface` (a NIC + its WAN/LAN
 * role and addressing), `nat_policy` (NAT44 / IPv6-mode / forwarding — one row per
 * node), `dhcp_server_config` (the LAN DHCP/RA server config — one row per node) and
 * `dhcp_lease` (the read model of active LAN leases reported by `ff-lan`). These are
 * node-LOCAL resources (not gossiped cluster-wide, like nginx routes). No seed.
 * Appended after AddRbacTables.
 */
export class AddRouterTables1788900000000 implements MigrationInterface {

    public name = 'AddRouterTables1788900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `network_interface` (`id` int NOT NULL AUTO_INCREMENT, `mac_address` varchar(64) NOT NULL, `name` varchar(64) NOT NULL DEFAULT '', `role` varchar(16) NOT NULL DEFAULT 'unassigned', `ipv4_mode` varchar(16) NOT NULL DEFAULT 'none', `ipv4_address` varchar(64) NOT NULL DEFAULT '', `ipv4_prefix` int NOT NULL DEFAULT '0', `disable` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `nat_policy` (`id` int NOT NULL AUTO_INCREMENT, `nat44_enabled` tinyint NOT NULL DEFAULT 0, `ipv6_mode` varchar(16) NOT NULL DEFAULT 'off', `forward_enabled` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `dhcp_server_config` (`id` int NOT NULL AUTO_INCREMENT, `enable` tinyint NOT NULL DEFAULT 0, `range_start` varchar(64) NOT NULL DEFAULT '', `range_end` varchar(64) NOT NULL DEFAULT '', `lease_time` int NOT NULL DEFAULT '3600', `gateway` varchar(64) NOT NULL DEFAULT '', `dns_server` varchar(255) NOT NULL DEFAULT '', `domain` varchar(255) NOT NULL DEFAULT '', `ra_enable` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `dhcp_lease` (`id` int NOT NULL AUTO_INCREMENT, `mac_address` varchar(64) NOT NULL, `ip_address` varchar(64) NOT NULL DEFAULT '', `hostname` varchar(255) NOT NULL DEFAULT '', `expires` int NOT NULL DEFAULT '0', `interface` varchar(64) NOT NULL DEFAULT '', PRIMARY KEY (`id`)) ENGINE=InnoDB");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE `dhcp_lease`");
        await queryRunner.query("DROP TABLE `dhcp_server_config`");
        await queryRunner.query("DROP TABLE `nat_policy`");
        await queryRunner.query("DROP TABLE `network_interface`");
    }

}
