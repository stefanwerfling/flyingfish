/**
 * DNS record base type, it is a very simple type for a record
 */
export type DnsRecordBase = {
    name: string;
    type: number;
    class: number;
    ttl: number;
    data: string;
};