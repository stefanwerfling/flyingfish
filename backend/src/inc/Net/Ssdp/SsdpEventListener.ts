import {SsdpEvent, SsdpEvents} from './SsdpEvent.js';

export type SsdpEventListener<T> = <E extends SsdpEvents>(ev: E, callback: SsdpEvent<E>) => T;