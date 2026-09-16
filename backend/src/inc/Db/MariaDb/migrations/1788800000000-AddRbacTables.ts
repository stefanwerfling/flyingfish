import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Add the RBAC tables (epic 9.5.13): `rbac_group`, `rbac_role`, `rbac_permission`,
 * the joins `rbac_user_group` (user↔group) and `rbac_role_permission` (role↔permission),
 * and `rbac_role_assignment` (grants a role to a group, optionally scoped to a
 * resource — the per-domain rights mechanism). Relations are plain id columns, no DB
 * foreign keys, matching the rest of the schema.
 *
 * Seeds a backward-compatible baseline: a `*` (all) permission, a `superadmin` role
 * holding it, an `Administrators` group granted `superadmin` globally, and every
 * existing user placed in that group — so today's single shared admin becomes a full
 * admin and nothing is locked out when enforcement turns on. Appended after
 * AddDomainClusterPriority.
 */
export class AddRbacTables1788800000000 implements MigrationInterface {

    public name = 'AddRbacTables1788800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `rbac_group` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `description` varchar(512) NOT NULL DEFAULT '', `disable` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `rbac_role` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `description` varchar(512) NOT NULL DEFAULT '', PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `rbac_permission` (`id` int NOT NULL AUTO_INCREMENT, `permission_key` varchar(128) NOT NULL, `description` varchar(512) NOT NULL DEFAULT '', PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `rbac_user_group` (`id` int NOT NULL AUTO_INCREMENT, `user_id` int NOT NULL DEFAULT '0', `group_id` int NOT NULL DEFAULT '0', PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `rbac_role_permission` (`id` int NOT NULL AUTO_INCREMENT, `role_id` int NOT NULL DEFAULT '0', `permission_id` int NOT NULL DEFAULT '0', PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `rbac_role_assignment` (`id` int NOT NULL AUTO_INCREMENT, `group_id` int NOT NULL DEFAULT '0', `role_id` int NOT NULL DEFAULT '0', `resource_type` varchar(64) NOT NULL DEFAULT '', `resource_id` int NOT NULL DEFAULT '0', PRIMARY KEY (`id`)) ENGINE=InnoDB");

        // Seed the backward-compatible full-admin baseline.
        await queryRunner.query("INSERT INTO `rbac_permission` (`permission_key`, `description`) VALUES ('*', 'All permissions (superadmin wildcard)')");
        await queryRunner.query("INSERT INTO `rbac_role` (`name`, `description`) VALUES ('superadmin', 'Full administrative access')");
        await queryRunner.query("INSERT INTO `rbac_group` (`name`, `description`, `disable`) VALUES ('Administrators', 'Default full-admin group', 0)");
        await queryRunner.query("INSERT INTO `rbac_role_permission` (`role_id`, `permission_id`) SELECT r.`id`, p.`id` FROM `rbac_role` r, `rbac_permission` p WHERE r.`name` = 'superadmin' AND p.`permission_key` = '*'");
        await queryRunner.query("INSERT INTO `rbac_role_assignment` (`group_id`, `role_id`, `resource_type`, `resource_id`) SELECT g.`id`, r.`id`, '', 0 FROM `rbac_group` g, `rbac_role` r WHERE g.`name` = 'Administrators' AND r.`name` = 'superadmin'");
        await queryRunner.query("INSERT INTO `rbac_user_group` (`user_id`, `group_id`) SELECT u.`id`, g.`id` FROM `user` u, `rbac_group` g WHERE g.`name` = 'Administrators'");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE `rbac_role_assignment`");
        await queryRunner.query("DROP TABLE `rbac_role_permission`");
        await queryRunner.query("DROP TABLE `rbac_user_group`");
        await queryRunner.query("DROP TABLE `rbac_permission`");
        await queryRunner.query("DROP TABLE `rbac_role`");
        await queryRunner.query("DROP TABLE `rbac_group`");
    }

}
