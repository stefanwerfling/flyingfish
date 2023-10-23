import {ISslCertProvider} from 'flyingfish_schemas';
import {APluginEvent} from '../../PluginSystem/APluginEvent.js';

/**
 * Abstract certificate provider on load event.
 */
export abstract class ACertProviderOnLoadEvent extends APluginEvent {

    /**
     * Return all supported Providers.
     * @returns {ISslCertProvider[]}
     */
    public abstract getProviders(): Promise<ISslCertProvider[]>;

}