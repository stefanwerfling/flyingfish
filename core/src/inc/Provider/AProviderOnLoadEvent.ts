import {APluginEvent} from '../PluginSystem/APluginEvent.js';
import {IProvider} from './IProvider.js';

/**
 * Provider on load event
 */
export abstract class AProviderOnLoadEvent<T extends IProvider> extends APluginEvent {

    /**
     * Return all supported Providers.
     * @returns {T[]}
     */
    public abstract getProviders(): Promise<T[]>;

}