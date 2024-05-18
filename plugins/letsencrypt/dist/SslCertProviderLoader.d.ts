import { ASslCertProviderOnLoadEvent, ISslCertProvider } from 'flyingfish_core';
export declare class SslCertProviderLoader extends ASslCertProviderOnLoadEvent {
    protected _providers: ISslCertProvider[];
    getName(): string;
    getProviders(): Promise<ISslCertProvider[]>;
}
