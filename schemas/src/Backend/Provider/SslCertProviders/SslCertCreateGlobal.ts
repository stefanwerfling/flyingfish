import {IDnsServer} from '../../Dns/IDnsServer.js';

/**
 * Global objects for creating a certificat.
 */
export type SslCertCreateGlobal = {

    /**
     * When dns server is not enable, then is dnsServer null.
     * @member {IDnsServer|null}
     */
    dnsServer?: IDnsServer|null;

};