import {ProviderEntry} from 'flyingfish_schemas';
import {IProvider} from './IProvider.js';

/**
 * Interface for Providers object
 */
export interface IProviders<E extends ProviderEntry, T extends IProvider<E>> {

    /**
     * Return the provider by name
     * @param {string} name
     * @returns {IProvider|null}
     */
    getProvider(name: string): Promise<T|null>;

    /**
     * Return all providers by name and title
     * @returns {E extends ProviderEntry[]}
     */
    getProviders(): Promise<E[]>;

}