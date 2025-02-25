import {ProviderEntry} from 'flyingfish_schemas';
import {PluginManager} from '../PluginSystem/PluginManager.js';
import {AProviderOnLoadEvent} from './AProviderOnLoadEvent.js';
import {IProvider} from './IProvider.js';
import {ProviderType} from './ProviderType.js';

/**
 * Base Provider
 */
export class BaseProviders<E extends ProviderEntry, T extends IProvider<E>> {

    /**
     * Return a provider by name
     * @param {string} name
     * @param {ProviderType} type
     * @protected
     * @returns {T extends IProvider|null}
     */
    protected async _getProvider(name: string, type: ProviderType): Promise<T | null> {
        const events = PluginManager.getInstance().getAllEvents<AProviderOnLoadEvent<E, T>>(AProviderOnLoadEvent<E, T>);

        for await (const event of events) {
            const providers = await event.getProviders();

            for (const provider of providers) {
                if (provider.getType() === type && provider.getName() === name) {
                    return provider;
                }
            }
        }

        return null;
    }

    /**
     * Get a provider list with name and title.
     * @param {ProviderType} type
     * @protected
     * @returns {ProviderEntry[]}
     */
    protected async _getProviders(type: ProviderType): Promise<E[]> {
        const list: E[] = [];

        const events = PluginManager.getInstance().getAllEvents<AProviderOnLoadEvent<E, T>>(AProviderOnLoadEvent<E, T>);

        for await (const event of events) {
            const providers = await event.getProviders();

            for (const provider of providers) {
                if (provider.getType() === type) {
                    list.push(provider.getProviderEntry());
                }
            }
        }

        return list;
    }

}