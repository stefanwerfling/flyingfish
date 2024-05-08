import {APluginEvent} from '../../PluginSystem/APluginEvent.js';
import {ISslCertProvider} from './ISslCertProvider.js';

/**
 * Abstract certificate provider on load event.
 */
export abstract class ASslCertProviderOnLoadEvent extends APluginEvent {

    /**
     * Return all supported Providers.
     * @returns {ISslCertProvider[]}
     */
    public abstract getProviders(): Promise<ISslCertProvider[]>;

}