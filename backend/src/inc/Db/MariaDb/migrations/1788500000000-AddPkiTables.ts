import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Add the PKI tables: `ca_certificate` (the internal CA tree, self-referenced by
 * `parent_ca_id`), `issued_certificate` (leaves issued through enrollment) and
 * `enrollment_request` (the EST-style enrollment state machine). Own-PKI epic
 * 9.4, slice 9.4.6-C — persistence for the PKI part container. Appended after the
 * AcmeDnsTempRecord migration; relations are plain id columns, no DB foreign
 * keys, matching the rest of the schema.
 */
export class AddPkiTables1788500000000 implements MigrationInterface {

    public name = 'AddPkiTables1788500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `ca_certificate` (`id` int NOT NULL AUTO_INCREMENT, `parent_ca_id` int NOT NULL DEFAULT '0', `ca_type` varchar(32) NOT NULL, `purpose` varchar(32) NOT NULL DEFAULT '', `subject` varchar(512) NOT NULL, `algorithm` varchar(32) NOT NULL, `certificate` text NOT NULL DEFAULT '', `private_key` text NOT NULL DEFAULT '', `public_key` text NOT NULL DEFAULT '', `created_at` int NOT NULL DEFAULT '0', PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `issued_certificate` (`id` int NOT NULL AUTO_INCREMENT, `ca_id` int NOT NULL DEFAULT '0', `node_uid` varchar(64) NOT NULL, `purpose` varchar(32) NOT NULL DEFAULT '', `common_name` varchar(512) NOT NULL, `certificate` text NOT NULL DEFAULT '', `chain` text NOT NULL DEFAULT '', `issued_at` int NOT NULL DEFAULT '0', `expires_at` int NOT NULL DEFAULT '0', PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `enrollment_request` (`id` int NOT NULL AUTO_INCREMENT, `request_uid` varchar(64) NOT NULL, `status` varchar(16) NOT NULL, `purpose` varchar(32) NOT NULL DEFAULT '', `node_uid` varchar(64) NOT NULL, `common_name` varchar(512) NOT NULL, `sans` text NOT NULL DEFAULT '', `validity_days` int NOT NULL DEFAULT '7', `csr` text NOT NULL DEFAULT '', `issued_certificate_id` int NOT NULL DEFAULT '0', `created_at` int NOT NULL DEFAULT '0', PRIMARY KEY (`id`)) ENGINE=InnoDB");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE `enrollment_request`");
        await queryRunner.query("DROP TABLE `issued_certificate`");
        await queryRunner.query("DROP TABLE `ca_certificate`");
    }

}