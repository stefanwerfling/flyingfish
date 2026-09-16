import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Add the RBAC tables (epic 9.5.13): `rbac_group`, `rbac_role`, `rbac_permission`,
 * the joins `rbac_user_group` (user↔group) and `rbac_role_permission` (role↔permission),
 * and `rbac_role_assignment` (grants a role to a group, optionally scoped to a
 * resource — the per-domain rights mechanism). Relations are plain id columns, no DB
 * foreign keys, matching the rest of the schema.
 *
 * IDENTITY (Cluster/Mesh epic 9.5.12, A+C shared rights DB): the POLICY tables
 * (group/role/permission/role_permission/role_assignment) are cluster-global and use
 * cluster-stable UUID (`varchar(36)`) primary keys + UUID cross-refs, so the same
 * logical policy row is identical across nodes and the gossip LWW store converges
 * leaderless. `rbac_user_group` stays NODE-LOCAL (int PK + int `user_id`) and binds a
 * local user to a global group via the group's UUID `group_id`; `resource_id` stays a
 * node-local int. Rewritten from the original int-id version — the tables are
 * unreleased (this feature branch), so no int→uuid data migration is needed.
 *
 * Seeds a backward-compatible baseline: a `*` (all) permission, a `superadmin` role
 * holding it, an `Administrators` group granted `superadmin` globally, and every
 * existing user placed in that group — so today's single shared admin becomes a full
 * admin and nothing is locked out when enforcement turns on. UUID ids are generated
 * with MariaDB `UUID()` (no app-layer generation runs inside a raw migration).
 * Appended after AddDomainClusterPriority.
 */
export class AddRbacTables1788800000000 implements MigrationInterface {

    public name = 'AddRbacTables1788800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `rbac_group` (`id` varchar(36) NOT NULL, `name` varchar(255) NOT NULL, `description` varchar(512) NOT NULL DEFAULT '', `disable` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `rbac_role` (`id` varchar(36) NOT NULL, `name` varchar(255) NOT NULL, `description` varchar(512) NOT NULL DEFAULT '', PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `rbac_permission` (`id` varchar(36) NOT NULL, `permission_key` varchar(128) NOT NULL, `description` varchar(512) NOT NULL DEFAULT '', PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `rbac_user_group` (`id` int NOT NULL AUTO_INCREMENT, `user_id` int NOT NULL DEFAULT '0', `group_id` varchar(36) NOT NULL DEFAULT '', PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `rbac_role_permission` (`id` varchar(36) NOT NULL, `role_id` varchar(36) NOT NULL DEFAULT '', `permission_id` varchar(36) NOT NULL DEFAULT '', PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `rbac_role_assignment` (`id` varchar(36) NOT NULL, `group_id` varchar(36) NOT NULL DEFAULT '', `role_id` varchar(36) NOT NULL DEFAULT '', `resource_type` varchar(64) NOT NULL DEFAULT '', `resource_id` int NOT NULL DEFAULT '0', PRIMARY KEY (`id`)) ENGINE=InnoDB");

        // Seed the backward-compatible full-admin baseline. The default POLICY rows use
        // FIXED, well-known UUIDs (not UUID()) so every node in the cluster seeds THE
        // SAME cluster-stable ids — the gossip then converges them to one logical row
        // instead of N per-node duplicates (Cluster/Mesh epic 9.5.12, A+C shared rights
        // DB; the default policy is a cluster singleton). rbac_user_group stays
        // node-local (each node binds its own users to the shared Administrators group).
        await queryRunner.query("INSERT INTO `rbac_permission` (`id`, `permission_key`, `description`) VALUES ('00000000-0000-4000-8000-000000000001', '*', 'All permissions (superadmin wildcard)')");
        await queryRunner.query("INSERT INTO `rbac_role` (`id`, `name`, `description`) VALUES ('00000000-0000-4000-8000-000000000002', 'superadmin', 'Full administrative access')");
        await queryRunner.query("INSERT INTO `rbac_group` (`id`, `name`, `description`, `disable`) VALUES ('00000000-0000-4000-8000-000000000003', 'Administrators', 'Default full-admin group', 0)");
        await queryRunner.query("INSERT INTO `rbac_role_permission` (`id`, `role_id`, `permission_id`) VALUES ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001')");
        await queryRunner.query("INSERT INTO `rbac_role_assignment` (`id`, `group_id`, `role_id`, `resource_type`, `resource_id`) VALUES ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', '', 0)");
        await queryRunner.query("INSERT INTO `rbac_user_group` (`user_id`, `group_id`) SELECT u.`id`, '00000000-0000-4000-8000-000000000003' FROM `user` u");
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
