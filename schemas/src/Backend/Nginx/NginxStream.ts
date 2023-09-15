/**
 * Destination type for nginx streams.
 */
export enum NginxStreamDestinationType {
    upstream,
    listen,
    ssh_l,
    ssh_r
}

/**
 * SSH r for nginx streams.
 */
export enum NginxStreamSshR {
    none,
    in,
    out
}