/**
 * Raw device response
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