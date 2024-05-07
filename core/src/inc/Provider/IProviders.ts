import {ProviderEntry} from 'flyingfish_schemas';
import {IProvider} from './IProvider.js';

/**
 * Interface for Providers object
 */
export interface IProviders<T extends IProvider> {

    /**
     * Return the provider by name
     * @param {string} name
     * @returns {IProvider|null}
     */
    getProvider(name: string): Promise<T|null>;

    /**
     * Return all providers by name and title
     * @returns {ProviderEntry[]}
     */
    getProviders(): Promise<ProviderEntry[]>;

}