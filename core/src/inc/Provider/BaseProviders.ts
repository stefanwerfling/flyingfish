import {ProviderEntry} from 'flyingfish_schemas';
import {PluginManager} from '../PluginSystem/PluginManager.js';
import {AProviderOnLoadEvent} from './AProviderOnLoadEvent.js';
import {IProvider} from './IProvider.js';

export class BaseProviders {

    /**
     * Return a provider by name
     * @param {string} name
     * @protected
     * @returns {T extends IProvider|null}
     */
    protected async _getProvider<T extends IProvider>(name: string): Promise<T | null> {
        const events = PluginManager.getInstance().getAllEvents<AProviderOnLoadEvent<T>>(AProviderOnLoadEvent<T>);

        for await (const event of events) {
            const providers = await event.getProviders();

            for (const provider of providers) {
                if (provider.getName() === name) {
                    return provider;
                }
            }
        }

        return null;
    }

    /**
     * Get a provider list with name and title.
     * @protected
     * @returns {ProviderEntry[]}
     */
    protected async _getProviders<T extends IProvider>(): Promise<ProviderEntry[]> {
        const list: ProviderEntry[] = [];

        const events = PluginManager.getInstance().getAllEvents<AProviderOnLoadEvent<T>>(AProviderOnLoadEvent<T>);

        for await (const event of events) {
            const providers = await event.getProviders();

            for (const provider of providers) {
                list.push({
                    name: provider.getName(),
                    title: provider.getTitle()
                });
            }
        }

        return list;
    }

}