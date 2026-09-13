import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Add the revocation columns to `issued_certificate`: `revoked` (has the leaf
 * been revoked) and `revoked_at` (epoch ms, 0 = not revoked). Own-PKI epic 9.4,
 * revocation slice 9.4.4-A — the durable record the real-time Hub allowlist is
 * rebuilt from. Appended after the AddPkiTables migration.
 */
export class AddPkiRevocation1788600000000 implements MigrationInterface {

    public name = 'AddPkiRevocation1788600000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `issued_certificate` ADD `revoked` tinyint NOT NULL DEFAULT 0");
        await queryRunner.query("ALTER TABLE `issued_certificate` ADD `revoked_at` int NOT NULL DEFAULT '0'");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `issued_certificate` DROP COLUMN `revoked_at`");
        await queryRunner.query("ALTER TABLE `issued_certificate` DROP COLUMN `revoked`");
    }

}