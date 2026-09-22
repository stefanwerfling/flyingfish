import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Node operating mode + target settings (Attach/Router epic). Node-LOCAL singleton. The
 * initial mode is derived from the current router state: if any interface already has the
 * `wan` role the node is treated as `router`, otherwise `attach`.
 */
export class AddSystemConfig1789500000000 implements MigrationInterface {

    public name = 'AddSystemConfig1789500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'CREATE TABLE `system_config` (' +
            '`id` int NOT NULL AUTO_INCREMENT, ' +
            "`mode` varchar(16) NOT NULL DEFAULT 'attach', " +
            "`target_ip` varchar(64) NOT NULL DEFAULT '', " +
            "`attach_interface` varchar(64) NOT NULL DEFAULT '', " +
            'PRIMARY KEY (`id`)) ENGINE=InnoDB'
        );

        // seed a single row; mode = router if a WAN role already exists, else attach
        await queryRunner.query(
            'INSERT INTO `system_config` (`mode`, `target_ip`, `attach_interface`) ' +
            "SELECT (CASE WHEN EXISTS (SELECT 1 FROM `network_interface` WHERE `role` = 'wan') " +
            "THEN 'router' ELSE 'attach' END), '', ''"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE `system_config`');
    }

}
