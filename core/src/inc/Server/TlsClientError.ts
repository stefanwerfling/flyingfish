/**
 * Definition from TLSClientError
 */
export class TlsClientError extends Error {

    /**
     * Library
     */
    public library: string = '';

    /**
     * Error reason
     */
    public reason: string = '';

    /**
     * Error code
     */
    public code: string = '';

    /**
     * Error stack
     */
    public stack: string = '';

}