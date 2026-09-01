import {DnsAnswer} from 'dns2';

/**
 * DnsAnswerNS
 */
export interface DnsAnswerNS extends DnsAnswer {
    ns?: string;
}