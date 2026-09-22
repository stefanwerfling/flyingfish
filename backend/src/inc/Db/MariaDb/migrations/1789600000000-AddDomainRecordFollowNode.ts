import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Add the `follow_node` flag to `domain_record` (Attach/Router epic). When set, an A/AAAA
 * record answers with this node's resolved target IP instead of its stored `dvalue`.
 * Default off, so existing records keep answering with their stored value.
 */
export class AddDomainRecordFollowNode1789600000000 implements MigrationInterface {

    public name = 'AddDomainRecordFollowNode1789600000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE `domain_record` ADD `follow_node` tinyint NOT NULL DEFAULT 0'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `domain_record` DROP COLUMN `follow_node`');
    }

}
