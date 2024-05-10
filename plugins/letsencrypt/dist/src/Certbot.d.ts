import { FSslCertProviderOnReset, ISslCertProvider, SslCertBundel, SslCertCreateOptions } from 'flyingfish_core';
export declare class Certbot implements ISslCertProvider {
    static readonly LIMIT_REQUESTS = 5;
    static readonly LIMIT_TIME_HOUR = 1;
    static readonly PEM_CERT = "cert.pem";
    static readonly PEM_CHAIN = "chain.pem";
    static readonly PEM_FULLCHAIN = "fullchain.pem";
    static readonly PEM_PRIVTKEY = "privkey.pem";
    protected _command: string;
    protected _config: string;
    protected _livePath: string;
    getName(): string;
    getTitle(): string;
    isSupportWildcard(): boolean;
    isReadyForRequest(lastRequest: number, tryCount: number, onResetTryCount?: FSslCertProviderOnReset): Promise<boolean>;
    protected _getDomainDir(domainName: string): string;
    existCertificate(domainName: string): Promise<boolean>;
    getCertificationBundel(domainName: string): Promise<SslCertBundel | null>;
    createCertificate(options: SslCertCreateOptions): Promise<boolean>;
}
