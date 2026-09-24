import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Add `cluster_node_group_share` (Cluster/Mesh epic 9.5.12.4): a node's explicit rule
 * sharing one resource type with one node group, at `read` or `write`. Default-deny — a
 * resource type crosses the node boundary to a group only once a share row grants it. Same
 * cluster-global POLICY identity model as AddClusterNodeGroups (cluster-stable UUID
 * `varchar(36)` primary key, gossip LWW convergence). Appended after AddClusterNodeGroups.
 */
export class AddClusterNodeGroupShares1789900000000 implements MigrationInterface {

    public name = 'AddClusterNodeGroupShares1789900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `cluster_node_group_share` (`id` varchar(36) NOT NULL, `node_uid` varchar(36) NOT NULL DEFAULT '', `group_uuid` varchar(36) NOT NULL DEFAULT '', `resource_type` varchar(64) NOT NULL DEFAULT '', `level` varchar(16) NOT NULL DEFAULT 'read', PRIMARY KEY (`id`)) ENGINE=InnoDB");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE `cluster_node_group_share`');
    }

}
