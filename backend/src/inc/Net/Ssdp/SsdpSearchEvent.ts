import {SsdpEvents} from './SsdpEvent.js';
import {SsdpSearchArgs} from './SsdpSearchCallback.js';

/**
 * Ssdp search event type.
 */
export type SsdpSearchEvent = <E extends SsdpEvents>(ev: E, ...args: E extends 'device' ? SsdpSearchArgs : []) => boolean;