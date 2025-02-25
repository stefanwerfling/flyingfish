import {ProviderEntry} from 'flyingfish_schemas/dist/src/index.js';
import {AProviderOnLoadEvent} from '../AProviderOnLoadEvent.js';
import {ICredentialProvider} from './ICredentialProvider.js';

/**
 * Abstract class for provider on load event
 */
export abstract class ACredentialProviderOnLoadEvent extends AProviderOnLoadEvent<ProviderEntry, ICredentialProvider> {}