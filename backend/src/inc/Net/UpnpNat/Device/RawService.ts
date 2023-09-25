/**
 * Raw service type.
 */
export type RawService = {
    serviceType: string;
    serviceId: string;
    controlURL?: string;
    eventSubURL?: string;
    SCPDURL?: string;
};