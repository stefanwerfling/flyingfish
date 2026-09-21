import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Port forwarding / inbound firewall rules (Pi-router epic, Phase 2). Each row is one
 * controlled hole in the WAN input firewall (Phase 1): unsolicited inbound on a WAN port
 * is either DNAT'd to a LAN host or accepted to a service on the router itself.
 */
export class AddPortForward1789400000000 implements MigrationInterface {

    public name = 'AddPortForward1789400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'CREATE TABLE `port_forward` (' +
            '`id` int NOT NULL AUTO_INCREMENT, ' +
            "`proto` varchar(8) NOT NULL DEFAULT 'tcp', " +
            '`wan_port` int NOT NULL, ' +
            '`wan_port_end` int NOT NULL DEFAULT 0, ' +
            "`family` varchar(8) NOT NULL DEFAULT 'ipv4', " +
            "`target_type` varchar(8) NOT NULL DEFAULT 'host', " +
            "`target_host` varchar(64) NOT NULL DEFAULT '', " +
            '`target_port` int NOT NULL DEFAULT 0, ' +
            '`enabled` tinyint NOT NULL DEFAULT 1, ' +
            "`description` varchar(255) NOT NULL DEFAULT '', " +
            'PRIMARY KEY (`id`)) ENGINE=InnoDB'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE `port_forward`');
    }

}
