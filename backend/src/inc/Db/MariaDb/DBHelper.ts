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

}