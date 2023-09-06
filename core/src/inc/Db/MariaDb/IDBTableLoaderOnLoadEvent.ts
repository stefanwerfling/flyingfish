import {IPluginEvent} from '../../PluginSystem/IPluginEvent.js';
import {EntitySchema} from 'typeorm';

/**
 * IDBTableLoaderOnLoadEvent
 */
export abstract class IDBTableLoaderOnLoadEvent extends IPluginEvent {

    /**
     * onRegisterTables
     */
    public abstract onRegisterEntities(): Promise<EntitySchema[]>;

}