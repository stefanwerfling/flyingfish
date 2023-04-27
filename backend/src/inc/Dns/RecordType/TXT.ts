import {DnsAnswer} from 'dns2';

/**
 * DnsAnswerTXT
 */
export interface DnsAnswerTXT extends DnsAnswer {
    data?: string;
}