import {ProviderEntry} from 'flyingfish_schemas/dist/src/index.js';
import {IProviders} from '../IProviders.js';
import {ICredentialProvider} from './ICredentialProvider.js';

/**
 * Interface of credential providers
 */
export type ICredentialProviders = IProviders<ProviderEntry, ICredentialProvider>;