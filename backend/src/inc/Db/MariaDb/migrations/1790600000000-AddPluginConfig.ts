import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * Per-plugin state for the plugin config-UI feature (9.9.x): one row per plugin,
 * keyed by the unique plugin manifest name. `enabled` is the runtime activation
 * flag (loading itself is gated by the plugin signature, not this flag); `data`
 * holds the plugin's config values as a JSON blob validated against its UI schema.
 */
export class AddPluginConfig1790600000000 implements MigrationInterface {

    public name = 'AddPluginConfig1790600000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'CREATE TABLE `plugin_config` (' +
            '`id` int NOT NULL AUTO_INCREMENT, ' +
            '`plugin_name` varchar(255) NOT NULL, ' +
            '`enabled` tinyint NOT NULL DEFAULT 1, ' +
            "`data` text NOT NULL DEFAULT '', " +
            'UNIQUE INDEX `IDX_plugin_config_plugin_name` (`plugin_name`), ' +
            'PRIMARY KEY (`id`)) ENGINE=InnoDB'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE `plugin_config`');
    }

}
