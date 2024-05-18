import {AProviderOnLoadEvent} from '../AProviderOnLoadEvent.js';
import {ICredentialProvider} from './ICredentialProvider.js';

/**
 * Abstract class for provider on load event
 */
export abstract class ACredentialProviderOnLoadEvent extends AProviderOnLoadEvent<ICredentialProvider> {}