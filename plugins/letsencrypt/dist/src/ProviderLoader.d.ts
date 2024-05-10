import { ASslCertProviderOnLoadEvent, ISslCertProvider } from 'flyingfish_core';
export declare class ProviderLoader extends ASslCertProviderOnLoadEvent {
    protected _providers: ISslCertProvider[];
    getName(): string;
    getProviders(): Promise<ISslCertProvider[]>;
}
