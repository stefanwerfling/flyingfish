import {DnsAnswer} from 'dns2';

/**
 * DnsAnswerMX
 */
export interface DnsAnswerMX extends DnsAnswer {
    exchange?: string;
}