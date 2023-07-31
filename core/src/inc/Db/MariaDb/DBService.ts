import {DeleteResult, EntityTarget, Repository} from 'typeorm';
import {DBBaseEntityId} from './DBBaseEntityId.js';
import {DBHelper} from './DBHelper.js';

/**
 * DBServiceId
 */
export abstract class DBService<T extends DBBaseEntityId> {

    /**
     * instance
     * @protected
     */
    protected static _instance = new Map<string, DBService<any>>();

    /**
     * repository for T
     * @private
     */
    protected readonly _repository: Repository<T>;

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
        this._repository = DBHelper.getRepository(target);
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
     * remove
     * @param id
     */
    public async remove(id: number): Promise<DeleteResult> {
        return this._repository.delete(id);
    }

    /**
     * save
     * @param T extend DBBaseEntityId
     */
    public async save(entity: T): Promise<T> {
        return this._repository.save(entity);
    }

}