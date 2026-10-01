import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Central Log-Center store (observability epic): one row per log record pushed by any
 * FlyingFish part (via the HubLogTransport → `/json/logs/ingest`). Indexed on ts/area/level
 * for the filterable log UI (time range, component, level) and retention cleanup.
 */
export class AddLogEntry1790300000000 implements MigrationInterface {

    public name = 'AddLogEntry1790300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'CREATE TABLE `log_entry` (' +
            '`id` int NOT NULL AUTO_INCREMENT, ' +
            '`ts` datetime(3) NOT NULL, ' +
            "`area` varchar(32) NOT NULL DEFAULT '', " +
            "`level` varchar(16) NOT NULL DEFAULT 'info', " +
            '`message` text NOT NULL, ' +
            '`meta` text NULL, ' +
            'PRIMARY KEY (`id`), ' +
            'INDEX `IDX_log_entry_ts` (`ts`), ' +
            'INDEX `IDX_log_entry_area` (`area`), ' +
            'INDEX `IDX_log_entry_level` (`level`)) ENGINE=InnoDB'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE `log_entry`');
    }

}
