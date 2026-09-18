import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Make NAT per-interface (Pi-router UI v2). NAT44 + the IPv6 mode move from the single
 * global `nat_policy` row onto each LAN `network_interface`, so every LAN can differ (one
 * NAT66, another PD-routed). `nat_policy.forward_enabled` stays the router-wide switch.
 *
 * Adds `nat44_enabled` + `ipv6_mode` to `network_interface` and seeds them on existing LAN
 * interfaces from the current global policy (so a live node keeps its behaviour).
 */
export class AddNatPerInterface1789300000000 implements MigrationInterface {

    public name = 'AddNatPerInterface1789300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `network_interface` ADD `nat44_enabled` tinyint NOT NULL DEFAULT 0");
        await queryRunner.query("ALTER TABLE `network_interface` ADD `ipv6_mode` varchar(16) NOT NULL DEFAULT 'off'");

        // Seed existing LAN interfaces from the global policy (if a policy row exists).
        await queryRunner.query(
            "UPDATE `network_interface` SET " +
            "`nat44_enabled` = COALESCE((SELECT `nat44_enabled` FROM `nat_policy` ORDER BY `id` LIMIT 1), 0), " +
            "`ipv6_mode` = COALESCE((SELECT `ipv6_mode` FROM `nat_policy` ORDER BY `id` LIMIT 1), 'off') " +
            "WHERE `role` = 'lan'"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `network_interface` DROP COLUMN `ipv6_mode`");
        await queryRunner.query("ALTER TABLE `network_interface` DROP COLUMN `nat44_enabled`");
    }

}
