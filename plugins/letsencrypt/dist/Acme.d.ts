import { FSslCertProviderOnReset, ISslCertProvider, SslCertBundel, SslCertBundelOptions, SslCertCreateGlobal, SslCertCreateOptions, SslCertExistOptions } from 'flyingfish_core';
export declare class Acme implements ISslCertProvider {
    static readonly LIMIT_REQUESTS = 5;
    static readonly LIMIT_TIME_HOUR = 1;
    static readonly PEM_CERT = "cert.pem";
    static readonly PEM_CHAIN = "chain.pem";
    static readonly PEM_FULLCHAIN = "fullchain.pem";
    static readonly PEM_PRIVTKEY = "privkey.pem";
    protected _livePath: string;
    getName(): string;
    getTitle(): string;
    isSupportWildcard(): boolean;
    isReadyForRequest(lastRequest: number, tryCount: number, onResetTryCount?: FSslCertProviderOnReset): Promise<boolean>;
    protected _getDomainDir(domainName: string): string;
    protected _getFileName(fileType: string, isWildcard?: boolean): string;
    existCertificate(domainName: string, options: SslCertExistOptions): Promise<boolean>;
    getCertificationBundel(domainName: string, options: SslCertBundelOptions): Promise<SslCertBundel | null>;
    createCertificate(options: SslCertCreateOptions, global: SslCertCreateGlobal): Promise<boolean>;
}
