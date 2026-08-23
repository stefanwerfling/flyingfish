import {
    DataSource,
    DataSourceOptions,
    EntityTarget,
    ObjectLiteral,
    Repository
} from 'typeorm';

/**
 * DbHelper
 */
export class DBHelper {

    /**
     * data sources
     * @protected
     */
    protected static _sources: Map<string, DataSource> = new Map();

    /**
     * init
     * @param options
     */
    public static async init(options: DataSourceOptions): Promise<void> {
        const dataSource = new DataSource(options);
        await dataSource.initialize();

        let name = 'default';

        if (options.name) {
            name = options.name;
        }

        DBHelper._sources.set(name, dataSource);
    }

    /**
     * getDataSource
     * @param sourceName
     */
    public static getDataSource(sourceName?: string): DataSource {
        let name = 'default';

        if (sourceName) {
            name = sourceName;
        }

        const dataSource = DBHelper._sources.get(name);

        if (!dataSource) {
            throw new Error('Datasource is empty');
        }

        return dataSource;
    }

    /**
     * getRepository
     * @param target
     * @param sourceName
     */
    public static getRepository<Entity extends ObjectLiteral>(target: EntityTarget<Entity>, sourceName?: string): Repository<Entity> {
        const dataSource = DBHelper.getDataSource(sourceName);
        return dataSource.getRepository(target);
    }

    /**
     * Run pending migrations.
     *
     * When a baseline is provided and a legacy schema is detected (the legacy
     * table exists but the migrations table does not yet), the initial migration
     * is stamped as already applied instead of being executed. This lets existing
     * databases (whose schema was created by the former synchronize:true) adopt
     * migrations without recreating their schema.
     * @param sourceName
     * @param baseline
     */
    public static async runMigrations(
        sourceName?: string,
        baseline?: {legacyTable: string; migrationName: string; timestamp: number}
    ): Promise<void> {
        const dataSource = DBHelper.getDataSource(sourceName);

        if (baseline) {
            const legacy = await dataSource.query(`SHOW TABLES LIKE '${baseline.legacyTable}'`);
            const migrationsTable = await dataSource.query('SHOW TABLES LIKE \'migrations\'');

            if (legacy.length > 0 && migrationsTable.length === 0) {
                await dataSource.query('CREATE TABLE `migrations` (`id` int NOT NULL AUTO_INCREMENT, `timestamp` bigint NOT NULL, `name` varchar(255) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB');
                await dataSource.query('INSERT INTO `migrations`(`timestamp`, `name`) VALUES (?, ?)', [baseline.timestamp, baseline.migrationName]);
            }
        }

        await dataSource.runMigrations();
    }

}