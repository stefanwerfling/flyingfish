import EventEmitter from 'events';
import {SsdpEventListener} from './SsdpEventListener.js';
import {SsdpSearchEvent} from './SsdpSearchEvent.js';

/**
 * Ssdp emitter object.
 */
export interface SsdpEmitter extends EventEmitter {

    removeListener: SsdpEventListener<this>;
    addListener: SsdpEventListener<this>;
    once: SsdpEventListener<this>;
    on: SsdpEventListener<this>;

    emit: SsdpSearchEvent;

    _ended?: boolean;
}