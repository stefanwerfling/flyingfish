import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Add the cluster node-group tables (Cluster/Mesh epic 9.5.12.3): `cluster_node_group`
 * (a group of nodes — "zone"/"pool") and `cluster_node_group_member` (a node's membership,
 * n:m). Both are cluster-global POLICY tables with cluster-stable UUID (`varchar(36)`)
 * primary keys + UUID cross-refs, so the same logical row is identical across nodes and
 * the gossip LWW store converges leaderless — the same identity model as the RBAC policy
 * tables (AddRbacTables). `node_uid` is the member node's mesh UUID (as in the gossip
 * roster). Relations are plain id columns, no DB foreign keys, matching the rest of the
 * schema. Appended after AddDhcpRaParams.
 */
export class AddClusterNodeGroups1789800000000 implements MigrationInterface {

    public name = 'AddClusterNodeGroups1789800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `cluster_node_group` (`id` varchar(36) NOT NULL, `name` varchar(255) NOT NULL, `description` varchar(512) NOT NULL DEFAULT '', `color` varchar(32) NOT NULL DEFAULT '', PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `cluster_node_group_member` (`id` varchar(36) NOT NULL, `node_uid` varchar(36) NOT NULL DEFAULT '', `group_uuid` varchar(36) NOT NULL DEFAULT '', PRIMARY KEY (`id`)) ENGINE=InnoDB");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE `cluster_node_group_member`');
        await queryRunner.query('DROP TABLE `cluster_node_group`');
    }

}
