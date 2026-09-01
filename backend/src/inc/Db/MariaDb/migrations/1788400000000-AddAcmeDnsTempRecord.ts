import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Add the `acme_dns_temp_record` table.
 *
 * Shared store for the ACME DNS-01 challenge across the process boundary: the
 * backend writes the temporary `_acme-challenge.<domain>` TXT record and the
 * standalone DNS server reads it at query time (DNS-server container extraction,
 * roadmap 9.2.3). Appended after the InitialSchema baseline.
 */
export class AddAcmeDnsTempRecord1788400000000 implements MigrationInterface {

    public name = 'AddAcmeDnsTempRecord1788400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `acme_dns_temp_record` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(512) NOT NULL, `dtype` int NOT NULL, `dclass` int NOT NULL, `ttl` int NOT NULL, `dvalue` text NOT NULL DEFAULT '', PRIMARY KEY (`id`)) ENGINE=InnoDB");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE `acme_dns_temp_record`");
    }

}
