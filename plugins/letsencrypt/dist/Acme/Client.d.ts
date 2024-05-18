/// <reference types="node" resolution-mode="require"/>
import * as crypto from 'crypto';
export type LetsEncryptClientOptions = {
    keysize?: number;
};
type LetsEncryptDirectory = any & {
    keyChange: string;
    meta: {
        caaIdentities: string[];
        termsOfService: string;
        website: string;
    };
    newAccount: string;
    newNonce: string;
    newOrder: string;
    renewalInfo: string;
    revokeCert: string;
};
type LetsEncryptPostNewAccountOptions = {
    onlyReturnExisting: boolean;
};
type LetsEncryptNewAccount = {
    nonce: string;
    accountUrl: string;
};
type LetsEncryptNewOrder = {
    nonce: string;
    order: any;
};
type LetsEncryptOrderAuthorization = {
    nonce: string;
    authorization: any;
};
type LetsEncryptDnsChallenge = {
    recordName: string;
    recordText: string;
    order: any;
};
export type LetsEncryptDnsChallengeAndFinalize = {
    pemCertChain: string[];
    pkcs8Key: string;
};
export declare class Client {
    static POLL_DELAY: number;
    protected _endpoint: string;
    protected _keySize: number;
    protected _directory: LetsEncryptDirectory;
    protected _jwk?: crypto.webcrypto.JsonWebKey;
    protected _accountUrl?: string;
    constructor(options?: LetsEncryptClientOptions);
    init(jwk?: crypto.webcrypto.JsonWebKey): Promise<boolean>;
    getJwk(): crypto.webcrypto.JsonWebKey | undefined;
    private _throwIfErrored;
    private _generateJwk;
    private _getNewNonce;
    private _parseJwt;
    private _jsonToBase64Url;
    private _arrayBufferToBase64Url;
    private _jwtFromJson;
    postNewAccount(nonce: string, jwk: crypto.webcrypto.JsonWebKey, directory: LetsEncryptDirectory, options?: LetsEncryptPostNewAccountOptions): Promise<LetsEncryptNewAccount>;
    postNewOrder(nonce: string, jwk: crypto.webcrypto.JsonWebKey, directory: LetsEncryptDirectory, accountUrl: string, domainName: string): Promise<LetsEncryptNewOrder>;
    getOrderAuthorization(nonce: string, jwk: crypto.webcrypto.JsonWebKey, accountUrl: string, order: any): Promise<LetsEncryptOrderAuthorization>;
    private _thumbprint;
    private _calculateRecordText;
    private _postOrderChallenge;
    private _generateCsr;
    private _postOrderFinalize;
    private _getOrder;
    private _parsePemCertChain;
    private _getPemCertChain;
    requestDnsChallenge(domainName: string): Promise<LetsEncryptDnsChallenge | null>;
    submitDnsChallengeAndFinalize(order: any): Promise<LetsEncryptDnsChallengeAndFinalize | null>;
}
export {};
