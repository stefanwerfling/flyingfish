import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * DHCP server config becomes PER-INTERFACE (Pi-router epic, Router-UX slice 2): add
 * `network_interface_id` to `dhcp_server_config` so each LAN NIC can run its own DHCP
 * server on its own subnet (the netdevice part runs one dnsmasq per LAN NIC). Migrates
 * the previous single row to the first lan-role interface. Appended after AddWanLease.
 */
export class AddDhcpPerInterface1789100000000 implements MigrationInterface {

    public name = 'AddDhcpPerInterface1789100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `dhcp_server_config` ADD `network_interface_id` int NOT NULL DEFAULT '0'");
        // Link the pre-existing single config row to the first LAN interface, if any.
        await queryRunner.query(
            "UPDATE `dhcp_server_config` SET `network_interface_id` = " +
            "COALESCE((SELECT `id` FROM `network_interface` WHERE `role` = 'lan' ORDER BY `id` ASC LIMIT 1), 0) " +
            "WHERE `network_interface_id` = 0"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `dhcp_server_config` DROP COLUMN `network_interface_id`");
    }

}
