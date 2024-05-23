import {ProviderEntry} from 'flyingfish_schemas';
import {ProviderType} from './ProviderType.js';

/**
 * Interface for a Provider
 */
export interface IProvider {

    /**
     * Return the keyname for provider as ident.
     * @returns {string}
     */
    getName(): string;

    /**
     * Return the title for provider (for frontend).
     * @returns {string}
     */
    getTitle(): string;

    /**
     * Return the type of provider
     * @returns {ProviderType}
     */
    getType(): ProviderType;

    /**
     * Return the provider entry
     * @returns {ProviderEntry}
     */
    getProviderEntry(): ProviderEntry;

}