import {ProviderSslEntry} from 'flyingfish_schemas/dist/src/index.js';
import {IProviders} from '../IProviders.js';
import {ISslCertProvider} from './ISslCertProvider.js';

/**
 * Interface of SslCertProviders
 */
export type ISslCertProviders = IProviders<ProviderSslEntry, ISslCertProvider>;