import {APluginEvent} from 'figtree';
import {EntitySchema} from 'typeorm';

/**
 * Abstract table loader on load event.
 */
export abstract class ADBTableLoaderOnLoadEvent extends APluginEvent {

    /**
     * Register all entities.
     * @returns {EntitySchema[]}
     */
    public abstract onRegisterEntities(): Promise<EntitySchema[]>;

}