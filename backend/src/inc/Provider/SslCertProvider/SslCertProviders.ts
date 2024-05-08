import {ASslCertProviderOnLoadEvent, ISslCertProvider, ISslCertProviders, PluginManager} from 'flyingfish_core';
import {ProviderEntry} from 'flyingfish_schemas';

/**
 * Ssl Certificate provider.
 */
export class SslCertProviders implements ISslCertProviders {

    /**
     * Get a provider object by provider name.
     * @param {string} name - Name of provider.
     * @returns {ISslCertProvider|null}
     */
    public async getProvider(name: string): Promise<ISslCertProvider | null> {
        const events = PluginManager.getInstance().getAllEvents<ASslCertProviderOnLoadEvent>(
            ASslCertProviderOnLoadEvent
        );

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
     * @returns {ProviderEntry[]}
     */
    public async getProviders(): Promise<ProviderEntry[]> {
        const list: ProviderEntry[] = [];

        const events = PluginManager.getInstance().getAllEvents<ASslCertProviderOnLoadEvent>(
            ASslCertProviderOnLoadEvent
        );

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