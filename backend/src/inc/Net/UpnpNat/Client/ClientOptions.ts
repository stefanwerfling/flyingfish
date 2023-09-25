/**
 * UpnpNat client options
 */
export type ClientOptions = {

    /**
     * Timeout
     */
    timeout?: number;

    /*
     * A multicast address does not work in a subnetwork, e.g. in the
     * Docker container, because it remains in the network area.
     * In order to be able to address a device in the higher network,
     * it can address it directly with the address/IP.
     */
    gatewayAddress?: string;
};