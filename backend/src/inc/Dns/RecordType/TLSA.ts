import {DnsAnswer} from 'dns2';
import {Vts} from 'vts';

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

export enum TLSACertificateUsage {
    CERTIFICATE_AUTHORITY_CONSTRAINT = '0',
    SERVICE_AUTHORITY_CONSTRAINT = '1',
    TRUST_ANCHOR_ASSERTION = '2',
    DOMAIN_ISSUED_CERTIFICATE = '3'
}

export enum TLSASelector {
    FULL_CERTIFICATE = '0',
    USE_SUBJECT_PUBLIC_KEY = '1'
}

export enum TLSAMatchingType {
    NO_HASH = '0',
    SHA256 = '1',
    SHA512 = '2'
}

export const SchemaRecordSettingsTlSA = Vts.object({
    certificate_usage: Vts.enum(TLSACertificateUsage),
    selector: Vts.enum(TLSASelector),
    matching_type: Vts.enum(TLSAMatchingType)
});