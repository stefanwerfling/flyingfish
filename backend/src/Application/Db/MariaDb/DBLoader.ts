import {DBLoader as CoreDBLoader, DBLoaderType} from 'figtree';
import {DBEntitiesLoader} from 'flyingfish_core';
import {InitialSchema1787961600000} from '../../../inc/Db/MariaDb/migrations/1787961600000-InitialSchema.js';

/**
 * DBLoader
 *
 * Supplies the entity list and migrations to figtree's `MariaDBService`.
 * The entities are still sourced from `flyingfish_core` (`DBEntitiesLoader`)
 * during the strangler migration; only the loading seam moves to figtree.
 */
export class DBLoader extends CoreDBLoader {

    /**
     * Load the FlyingFish entities.
     * @return {ReturnType<DBLoaderType['loadEntities']>}
     */
    public static override async loadEntities(): ReturnType<DBLoaderType['loadEntities']> {
        return DBEntitiesLoader.loadEntities() as ReturnType<DBLoaderType['loadEntities']>;
    }

    /**
     * Load the FlyingFish migrations. `InitialSchema` is the consolidated
     * baseline of the whole schema; further migrations append here.
     * @return {ReturnType<DBLoaderType['loadMigrations']>}
     */
    public static override loadMigrations(): ReturnType<DBLoaderType['loadMigrations']> {
        return [
            InitialSchema1787961600000
        ];
    }

}