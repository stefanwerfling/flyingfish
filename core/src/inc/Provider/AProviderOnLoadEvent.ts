import {ProviderEntry} from 'flyingfish_schemas';
import {APluginEvent} from '../PluginSystem/APluginEvent.js';
import {IProvider} from './IProvider.js';

/**
 * Provider on load event
 */
export abstract class AProviderOnLoadEvent<E extends ProviderEntry, T extends IProvider<E>> extends APluginEvent {

    /**
     * Return all supported Providers.
     * @returns {T[]}
     */
    public abstract getProviders(): Promise<T[]>;

}