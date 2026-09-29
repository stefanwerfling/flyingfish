import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Add the native JWT auth config (nginx-native Phase F) to `nginx_location`: an enable
 * flag plus the algorithm, HS256 secret, asymmetric PEM public key, and the optional
 * iss/aud/required-claim/leeway policy. Consumed by NginxConfigBuilder to emit the
 * `flyingfish_jwt` directive; validated locally by the native ngx_http_flyingfish_jwt
 * module.
 */
export class AddLocationJwtAuth1790200000000 implements MigrationInterface {

    public name = 'AddLocationJwtAuth1790200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `nginx_location` ADD `jwt_auth_enable` tinyint NOT NULL DEFAULT 0');
        await queryRunner.query("ALTER TABLE `nginx_location` ADD `jwt_alg` varchar(255) NOT NULL DEFAULT 'HS256'");
        await queryRunner.query("ALTER TABLE `nginx_location` ADD `jwt_secret` varchar(255) NOT NULL DEFAULT ''");
        await queryRunner.query('ALTER TABLE `nginx_location` ADD `jwt_public_key` text NULL');
        await queryRunner.query("ALTER TABLE `nginx_location` ADD `jwt_iss` varchar(255) NOT NULL DEFAULT ''");
        await queryRunner.query("ALTER TABLE `nginx_location` ADD `jwt_aud` varchar(255) NOT NULL DEFAULT ''");
        await queryRunner.query("ALTER TABLE `nginx_location` ADD `jwt_require` varchar(255) NOT NULL DEFAULT ''");
        await queryRunner.query("ALTER TABLE `nginx_location` ADD `jwt_leeway` int NOT NULL DEFAULT '0'");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `nginx_location` DROP COLUMN `jwt_leeway`');
        await queryRunner.query('ALTER TABLE `nginx_location` DROP COLUMN `jwt_require`');
        await queryRunner.query('ALTER TABLE `nginx_location` DROP COLUMN `jwt_aud`');
        await queryRunner.query('ALTER TABLE `nginx_location` DROP COLUMN `jwt_iss`');
        await queryRunner.query('ALTER TABLE `nginx_location` DROP COLUMN `jwt_public_key`');
        await queryRunner.query('ALTER TABLE `nginx_location` DROP COLUMN `jwt_secret`');
        await queryRunner.query('ALTER TABLE `nginx_location` DROP COLUMN `jwt_alg`');
        await queryRunner.query('ALTER TABLE `nginx_location` DROP COLUMN `jwt_auth_enable`');
    }

}
