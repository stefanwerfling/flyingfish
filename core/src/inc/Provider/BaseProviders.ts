import {ProviderEntry} from 'flyingfish_schemas';
import {PluginManager} from '../PluginSystem/PluginManager.js';
import {AProviderOnLoadEvent} from './AProviderOnLoadEvent.js';
import {IProvider} from './IProvider.js';
import {ProviderType} from './ProviderType.js';

export class BaseProviders {

    /**
     * Return a provider by name
     * @param {string} name
     * @param {ProviderType} type
     * @protected
     * @returns {T extends IProvider|null}
     */
    protected async _getProvider<T extends IProvider>(name: string, type: ProviderType): Promise<T | null> {
        const events = PluginManager.getInstance().getAllEvents<AProviderOnLoadEvent<T>>(AProviderOnLoadEvent<T>);

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
    protected async _getProviders<T extends IProvider>(type: ProviderType): Promise<ProviderEntry[]> {
        const list: ProviderEntry[] = [];

        const events = PluginManager.getInstance().getAllEvents<AProviderOnLoadEvent<T>>(AProviderOnLoadEvent<T>);

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