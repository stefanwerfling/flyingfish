import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Per-interface IPv6 RA timing (Pi-router NAT66 stability). Adds `ra_interval` and
 * `ra_router_lifetime` to `dhcp_server_config` so each LAN's router-advertisement
 * cadence + router lifetime are configurable in the UI. Frequent RAs + a router
 * lifetime greater than the address lifetime stop a downstream router's default route
 * from expiring while its address persists (the recurring "IPv6 present but no route"
 * failure). Defaults 60s / 9000s harden it out of the box.
 */
export class AddDhcpRaParams1789700000000 implements MigrationInterface {

    public name = 'AddDhcpRaParams1789700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `dhcp_server_config` ADD `ra_interval` int NOT NULL DEFAULT 60");
        await queryRunner.query("ALTER TABLE `dhcp_server_config` ADD `ra_router_lifetime` int NOT NULL DEFAULT 9000");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `dhcp_server_config` DROP COLUMN `ra_router_lifetime`");
        await queryRunner.query("ALTER TABLE `dhcp_server_config` DROP COLUMN `ra_interval`");
    }

}
