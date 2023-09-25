import {RawService} from './RawService.js';
import {RawDevice} from './RawDevice.js';

/**
 * Device description type.
 */
export type DeviceDescription = {
    services: RawService[];
    devices: RawDevice[];
};