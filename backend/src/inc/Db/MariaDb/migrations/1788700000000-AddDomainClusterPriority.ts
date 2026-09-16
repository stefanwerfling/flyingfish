import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Add the `cluster_priority` column to `domain` (Cluster/Mesh epic 9.5.14, HA/DNS
 * failover): this node's failover priority for the domain (lower = primary). The
 * cluster-wide domain view orders nodes by it so a domain's DNS A record follows the
 * lowest-priority live node. Default 0. Appended after the AddPkiRevocation migration.
 */
export class AddDomainClusterPriority1788700000000 implements MigrationInterface {

    public name = 'AddDomainClusterPriority1788700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `domain` ADD `cluster_priority` int NOT NULL DEFAULT '0'");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `domain` DROP COLUMN `cluster_priority`");
    }

}
