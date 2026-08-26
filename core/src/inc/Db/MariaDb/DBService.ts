import {DataSource, DeleteResult, EntityTarget, Repository} from 'typeorm';
import {DBHelper} from 'figtree';
import {DBBaseEntityId} from './DBBaseEntityId.js';

/**
 * DBService<DBBaseEntityId>
 */
export abstract class DBService<T extends DBBaseEntityId> {

    /**
     * instance
     * @protected
     */
    protected static _instance = new Map<string, DBService<any>>();

    /**
     * The DataSource all services read their repositories from. figtree's
     * DBHelper exposes it asynchronously; it is resolved once by `connect()`
     * (after `DBHelper.init()`) and cached, so repository access on the
     * services stays synchronous.
     * @protected
     */
    protected static _source: DataSource | null = null;

    /**
     * repository for T
     * @private
     */
    protected readonly _repository: Repository<T>;

    /**
     * Resolve and cache the initialized DataSource from figtree's DBHelper.
     * Call once at boot after `DBHelper.init()` and before any service is used.
     * @param {string} [sourceName] - optional named source (defaults to the default source)
     */
    public static async connect(sourceName?: string): Promise<void> {
        DBService._source = await DBHelper.getDataSource(sourceName);
    }

    /**
     * getSingleInstance
     */
    protected static getSingleInstance<I extends DBBaseEntityId, S extends DBService<I>>(
        tclass: new (tentrie: EntityTarget<I>) => S,
        tentrie: EntityTarget<I>,
        registerName: string
    ): S {
        let cls;

        if (DBService._instance.has(registerName)) {
            cls = DBService._instance.get(registerName);

            if (!(cls instanceof tclass)) {
                throw new Error('Class not found in register!');
            }
        } else {
            cls = new tclass(tentrie);

            DBService._instance.set(registerName, cls);
        }

        return cls;
    }

    /**
     * constructor
     * @param target
     */
    public constructor(target: EntityTarget<T>) {
        if (DBService._source === null) {
            throw new Error(
                'DBService: DataSource not connected. Call DBService.connect() after DBHelper.init() ' +
                'before using a service.'
            );
        }

        this._repository = DBService._source.getRepository(target);
    }

    /**
     * countAll
     */
    public async countAll(): Promise<number> {
        return this._repository.count();
    }

    /**
     * findAll
     */
    public async findAll(): Promise<T[]> {
        return this._repository.find();
    }

    /**
     * findOne
     * @param id
     */
    public async findOne(id: number): Promise<T | null> {
        const repository = this._repository as Repository<DBBaseEntityId>;

        const result = await repository.findOne({
            where: {
                id: id
            }
        });

        if (result) {
            return result as T;
        }

        return null;
    }

    /**
     * Remove a row (entry) by ID.
     * @param {number} id - ID from entry.
     * @returns {DeleteResult}
     */
    public async remove(id: number): Promise<DeleteResult> {
        return this._repository.delete(id);
    }

    /**
     * Save an entry object extend from DBBaseEntityId.
     * @param {T extend DBBaseEntityId} entity
     * @returns {T}
     */
    public async save(entity: T): Promise<T> {
        return this._repository.save(entity);
    }

    /**
     * Get access to repository for cross-query building and more.
     * @returns {Repository<T>}
     */
    public getRepository(): Repository<T> {
        return this._repository;
    }

    /**
     * Return the table name.
     * @returns {string}
     */
    public getTableName(): string {
        return this._repository.metadata.name;
    }

}