import {SsdpSearchCallback} from './SsdpSearchCallback.js';

/**
 * Ssdp events.
 */
export type SsdpEvents = 'device' | 'end';

/**
 * SsdpEvent
 */
export type SsdpEvent <E extends SsdpEvents> = E extends 'device' ? SsdpSearchCallback : () => void;