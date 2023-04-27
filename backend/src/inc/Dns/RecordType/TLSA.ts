import {DnsAnswer} from 'dns2';

/**
 * DnsAnswerTlSA
 * see https://www.dynu.com/Resources/DNS-Records/TLSA-Record
 */
export interface DnsAnswerTlSA extends DnsAnswer {
    certificate_usage?: number;
    selector?: number;
    matching_type?: number;
    certificate_association_data?: string;
}

export const TLSAMatchingType = {
    NO_HASH: 0,
    SHA256: 1,
    SHA512: 2
};