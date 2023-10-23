import {ACertProviderOnLoadEvent, PluginManager} from 'flyingfish_core';
import {ISslCertProvider, SslProvider} from 'flyingfish_schemas';

/**
 * Ssl Certificate provider.
 */
export class SslCertProviders {

    /**
     * Get a provider object by provider name.
     * @param {string} name - Name of provider.
     * @returns {ISslCertProvider|null}
     */
    public static async getProvider(name: string): Promise<ISslCertProvider|null> {
        const events = PluginManager.getInstance().getAllEvents<ACertProviderOnLoadEvent>(
            ACertProviderOnLoadEvent
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
     * @returns {SslProvider[]}
     */
    public static async getProviders(): Promise<SslProvider[]> {
        const list: SslProvider[] = [];

        const events = PluginManager.getInstance().getAllEvents<ACertProviderOnLoadEvent>(
            ACertProviderOnLoadEvent
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