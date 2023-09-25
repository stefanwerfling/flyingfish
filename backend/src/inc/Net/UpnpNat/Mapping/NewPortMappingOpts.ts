import {StandardOpts} from './StandardOpts.js';

/**
 * New port mapping options.
 */
export type NewPortMappingOpts = StandardOpts & {

    /**
     * Description for new port.
     */
    description?: string;

    /*
     * this is the address/ip of privat port destination
     * you can set, when the nat-upnp client not listens in the same network
     * for exsample in a docker container with own network
     */
    clientAddress?: string;

    // the value MUST be between 1 second and 604800 seconds
    ttl?: number;
};