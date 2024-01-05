/**
 * DNS record base type, it is a very simple type for a record
 */
export type DnsRecordBase = {
    type: number;
    data: string;
};