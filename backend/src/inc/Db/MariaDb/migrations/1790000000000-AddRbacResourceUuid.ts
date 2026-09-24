import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Add `resource_uuid` to `rbac_role_assignment` (Cluster/Mesh epic 9.5.12.4): lets a
 * grant scope to a cluster-stable UUID-keyed resource type (e.g. `node-group`), alongside
 * the existing node-local int `resource_id` used by types like `domain`. Which column is
 * meaningful depends on `resource_type`; both default to their "none" value (0 / '') so an
 * existing (global or int-scoped) grant is unaffected. Appended after
 * AddClusterNodeGroupShares.
 */
export class AddRbacResourceUuid1790000000000 implements MigrationInterface {

    public name = 'AddRbacResourceUuid1790000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `rbac_role_assignment` ADD `resource_uuid` varchar(36) NOT NULL DEFAULT ''");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `rbac_role_assignment` DROP COLUMN `resource_uuid`');
    }

}
