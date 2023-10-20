import {IDBTableLoaderOnLoadEvent} from 'flyingfish_core';
import {EntitySchema} from 'typeorm';

/**
 * LoadDb
 */
export class LoadDb extends IDBTableLoaderOnLoadEvent {

    /**
     * getName
     */
    public getName(): string {
        return 'LoadDb';
    }

    /**
     * onRegisterEntities
     */
    public async onRegisterEntities(): Promise<EntitySchema[]> {
        return [];
    }

}