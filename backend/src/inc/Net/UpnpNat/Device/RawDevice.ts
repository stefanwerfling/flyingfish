import {RawService} from './RawService.js';

/**
 * Raw device type.
 */
export type RawDevice = {
    deviceType: string;
    presentationURL: string;
    friendlyName: string;
    manufacturer: string;
    manufacturerURL: string;
    modelDescription: string;
    modelName: string;
    modelNumber: string;
    modelURL: string;
    serialNumber: string;
    UDN: string;
    UPC: string;
    serviceList?: { service: RawService | RawService[]; };
    deviceList?: { device: RawDevice | RawDevice[]; };
};