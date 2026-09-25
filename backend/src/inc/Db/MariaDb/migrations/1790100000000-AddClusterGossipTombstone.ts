import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Add `cluster_gossip_tombstone` (Cluster/Mesh epic 9.5.12.8 fix): pending deletes this
 * Hub keeps re-announcing into the gossip as tombstones until they've durably converged
 * everywhere — closes the bug where revoking a node-group share (or group/membership/
 * RBAC policy row) only removed the local DB row, so a node that already had a converged
 * copy would keep re-publishing it forever and silently resurrect the "deleted" row.
 */
export class AddClusterGossipTombstone1790100000000 implements MigrationInterface {

    public name = 'AddClusterGossipTombstone1790100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `cluster_gossip_tombstone` (`id` int NOT NULL AUTO_INCREMENT, `gossip_key` varchar(255) NOT NULL, `deleted_at` bigint NOT NULL DEFAULT '0', UNIQUE INDEX `IDX_af25c97875a7f31125c7385092` (`gossip_key`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE `cluster_gossip_tombstone`');
    }

}
