/**
 * AbuseipdbReport
 */
import got from 'got';

export type AbuseipdbReport = {
    reportedAt: string;
    comment: string;
    categories: number[];
    reporterId: number;
    reporterCountryCode: string;
    reporterCountryName: string;
};

/**
 * AbuseipdbCheck
 */
export type AbuseipdbCheck = {
    ipAddress: string;
    isPublic: boolean;
    ipVersion: number;
    isWhitelisted: boolean;
    abuseConfidenceScore: number;
    countryCode: string;
    countryName: string;
    usageType: string;
    isp: string;
    domain: string;
    hostnames: string[];
    totalReports: number;
    numDistinctUsers: number;
    lastReportedAt: string;
    reports: AbuseipdbReport[];
};

/**
 * AbuseipdbCheckResult
 */
export type AbuseipdbCheckResult = {
    data: AbuseipdbCheck;
};

/**
 * Abuseipdb
 */
export class Abuseipdb {

    /**
     * api key
     * @protected
     */
    protected _apiKey: string;

    /**
     * api key
     * @param apiKey
     */
    public constructor(apiKey: string) {
        this._apiKey = apiKey;
    }

    /**
     * check
     * @param ipAddress
     */
    public async check(ipAddress: string): Promise<AbuseipdbCheck|null> {
        const response = await got({
            url: `https://api.abuseipdb.com/api/v2/check?ipAddress=${ipAddress}`,
            responseType: 'json',
            headers: {
                Key: this._apiKey,
                Accept: 'application/json'
            }
        });

        if (response.body) {
            const result = response.body as AbuseipdbCheckResult;

            if (result.data) {
                return result.data;
            }
        }

        return null;
    }

}