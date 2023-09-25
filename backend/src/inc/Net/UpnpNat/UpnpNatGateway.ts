import {UpnpNatDevice} from './UpnpNatDevice.js';

/**
 * UpnpNat Gateway object.
 */
export type UpnpNatGateway = {
    gateway: UpnpNatDevice;
    address: string;
};