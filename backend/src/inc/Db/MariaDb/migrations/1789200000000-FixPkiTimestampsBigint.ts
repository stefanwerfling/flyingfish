import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Widen the PKI epoch-millisecond timestamp columns from `int` to `bigint`.
 *
 * They were created as `int` (max 2_147_483_647) but the PKI writes `Date.now()`
 * (epoch ms, ~1.8e12) into them — every write overflowed. Under MariaDB strict mode
 * this is a hard `ER_WARN_DATA_OUT_OF_RANGE` error: creating the Root CA
 * (`ca_certificate.created_at`) threw, so the pkiserver crash-looped and never bound
 * its bootstrap-token socket, which in turn blocked every part's PKI enrollment. `bigint`
 * holds ms epochs losslessly; the entities read the columns back as `number` via a
 * transformer. Own-PKI epic 9.4.
 */
export class FixPkiTimestampsBigint1789200000000 implements MigrationInterface {

    public name = 'FixPkiTimestampsBigint1789200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `ca_certificate` MODIFY `created_at` bigint NOT NULL DEFAULT '0'");
        await queryRunner.query("ALTER TABLE `issued_certificate` MODIFY `issued_at` bigint NOT NULL DEFAULT '0'");
        await queryRunner.query("ALTER TABLE `issued_certificate` MODIFY `expires_at` bigint NOT NULL DEFAULT '0'");
        await queryRunner.query("ALTER TABLE `issued_certificate` MODIFY `revoked_at` bigint NOT NULL DEFAULT '0'");
        await queryRunner.query("ALTER TABLE `enrollment_request` MODIFY `created_at` bigint NOT NULL DEFAULT '0'");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `ca_certificate` MODIFY `created_at` int NOT NULL DEFAULT '0'");
        await queryRunner.query("ALTER TABLE `issued_certificate` MODIFY `issued_at` int NOT NULL DEFAULT '0'");
        await queryRunner.query("ALTER TABLE `issued_certificate` MODIFY `expires_at` int NOT NULL DEFAULT '0'");
        await queryRunner.query("ALTER TABLE `issued_certificate` MODIFY `revoked_at` int NOT NULL DEFAULT '0'");
        await queryRunner.query("ALTER TABLE `enrollment_request` MODIFY `created_at` int NOT NULL DEFAULT '0'");
    }

}
