/**
 * Raw SSDP/UPNP repsonse
 * Entire SSDP/UPNP schema is beyond the scope of these typings.
 * Please look up the protol documentation if you wanna do
 * lower level communication.
 */
export type RawResponse = Partial<
    Record<
        string,
        {
            '@': { 'xmlns:u': string; };
            [key: string]: unknown;
        }
        >
    >;