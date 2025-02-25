import {ProviderSslEntry} from 'flyingfish_schemas';
import {AProviderOnLoadEvent} from '../AProviderOnLoadEvent.js';
import {ISslCertProvider} from './ISslCertProvider.js';

/**
 * Abstract certificate provider on load event.
 */
export abstract class ASslCertProviderOnLoadEvent extends AProviderOnLoadEvent<ProviderSslEntry, ISslCertProvider> {}