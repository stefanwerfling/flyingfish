import {JwkHelper} from 'flyingfish_core';
import * as crypto from 'crypto';
import forge from 'node-forge';

export type LetsEncryptClientOptions = {
    keysize?: number;
};

/**
 * Directory Json
 */
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

/**
 * post new account options
 */
type LetsEncryptPostNewAccountOptions = {
    onlyReturnExisting: boolean;
};

/**
 * New account
 */
type LetsEncryptNewAccount = {
    nonce: string;
    accountUrl: string;
};

/**
 * New order
 */
type LetsEncryptNewOrder = {
    nonce: string;
    order: any;
};

/**
 * Order authorization
 */
type LetsEncryptOrderAuthorization = {
    nonce: string;
    authorization: any;
};

/**
 * Parsed JWT
 */
type LetsEncryptParsedJwt = {
    protected: string;
    payload: string;
    signature: string;
};

/**
 * DNS challenge
 */
type LetsEncryptDnsChallenge = {
    recordName: string;
    recordText: string;
    order: any;
};

/**
 * Order challenge
 */
type LetsEncryptOrderChallenge = {
    nonce: string;
    authUrl: string;
};

type LetsEncryptGenerateCsr = {
    csr: string;
    pkcs8Key: string;
};

type LetsEncryptPostOrderFinalize = {
    nonce: string;
    orderUrl: string;
    certUrl?: string;
};

type LetsEncryptOrder = {
    nonce: string;
    status: string;
    certUrl?: string;
};

type LetsEncryptPemCertChain = {
    nonce: string;
    pemCertChain: string[];
};

export type LetsEncryptDnsChallengeAndFinalize = {
    pemCertChain: string[];
    pkcs8Key: string;
};

/**
 * ACME Client
 */
export class Client {

    public static POLL_DELAY = 5000;

    /**
     * Endpoint for letsencrypt
     * @protected
     */
    protected _endpoint: string = 'https://acme-v02.api.letsencrypt.org';

    /**
     * Key size for rsa
     * @protected
     */
    protected _keySize = 2048;

    /**
     * Directory Information.
     * @protected
     */
    protected _directory: LetsEncryptDirectory;

    /**
     * JWK
     * @protected
     */
    protected _jwk?: crypto.webcrypto.JsonWebKey;

    /**
     * account url
     * @protected
     */
    protected _accountUrl?: string;

    /**
     * @param {[LetsEncryptClientOptions]} options
     */
    public constructor(options?: LetsEncryptClientOptions) {
        if (options) {
            if (options.keysize) {
                this._keySize = options.keysize;
            }
        }
    }

    /**
     * Init the client.
     * @param {[crypto.webcrypto.JsonWebKey]} jwk
     * @returns {boolean}
     */
    public async init(jwk?: crypto.webcrypto.JsonWebKey): Promise<boolean> {
        this._directory = await (await fetch(`${this._endpoint}/directory`)).json() as LetsEncryptDirectory;
        let nonce = await this._getNewNonce(this._directory);

        if (nonce) {
            if (jwk) {
                this._jwk = jwk;
                const newAccount = await this.postNewAccount(nonce, this._jwk, this._directory, {onlyReturnExisting: true});

                nonce = newAccount.nonce;
                this._accountUrl = newAccount.accountUrl;
            } else {
                this._jwk = await this._generateJwk();

                const newAccount = await this.postNewAccount(nonce, this._jwk, this._directory);

                nonce = newAccount.nonce;
                this._accountUrl = newAccount.accountUrl;
            }

            return true;
        }

        return false;
    }

    /**
     * Return the jwk
     * @returns {crypto.webcrypto.JsonWebKey | undefined}
     */
    public getJwk(): crypto.webcrypto.JsonWebKey | undefined {
        return this._jwk;
    }

    /**
     * Throw a error when http status is bigger/same 400
     * @param resJson
     * @private
     */
    private _throwIfErrored(resJson: any): void {
        if (resJson.status && typeof resJson.status === 'number' && resJson.status >= 400) {
            throw new Error(JSON.stringify(resJson));
        }
    }

    /**
     * Generate a new jwk
     * @private
     */
    private async _generateJwk(): Promise<crypto.webcrypto.JsonWebKey> {
        return await JwkHelper.generateJwk();
    }

    /**
     * Return a new Nonce.
     * @param {LetsEncryptDirectory} directory
     * @private
     * @returns {string|null}
     */
    private async _getNewNonce(directory: LetsEncryptDirectory): Promise<string|null> {
        const res = await fetch(directory.newNonce, {
            method: 'HEAD'
        });

        return res.headers.get('Replay-Nonce');
    }

    /**
     * Parse the JWT to parts
     * @param {string} jwt
     * @private
     * @returns {LetsEncryptParsedJwt}
     */
    private _parseJwt(jwt: string): LetsEncryptParsedJwt {
        const jwtParts = jwt.split('.');

        return {
            protected: jwtParts[0],
            payload: jwtParts[1],
            signature: jwtParts[2]
        };
    }

    /**
     * convert json to a base64 url string
     * @param {object|string} json
     * @private
     * @returns {string}
     */
    private _jsonToBase64Url(json: object|string): string {
        return btoa(JSON.stringify(json))
        .replace(/\+/gu, '-')
        .replace(/\//gu, '_')
        .replace(/[=]+$/gu, '');
    }

    /**
     * Convert an ArrayBuffer to base64 url string
     * @param {ArrayBuffer} buf
     * @private
     * @returns {string}
     */
    private _arrayBufferToBase64Url(buf: ArrayBuffer): string {
        return btoa(Array.prototype.map.call(
            new Uint8Array(buf),
            (ch) => String.fromCharCode(ch)
        ).join(''))
        .replace(/\+/gu, '-')
        .replace(/\//gu, '_')
        .replace(/[=]+$/gu, '');
    }

    /**
     * Return jwt as string from json
     * @param {crypto.webcrypto.JsonWebKey} jwk
     * @param {object} header
     * @param {object|string} payload
     * @private
     * @returns {string}
     */
    private async _jwtFromJson(jwk: crypto.webcrypto.JsonWebKey, header: object, payload: object|string): Promise<string> {
        const privateKey = await crypto.subtle.importKey(
            'jwk', jwk, {
                name: 'ECDSA',
                namedCurve: 'P-256'
            },
            false,
            ['sign']
        );

        const base64Header = this._jsonToBase64Url(header);
        const base64Payload = payload === '' ? '' : this._jsonToBase64Url(payload);
        const base64Signature = this._arrayBufferToBase64Url(await crypto.subtle.sign(
            {
                name: 'ECDSA',
                hash: {
                    name: 'SHA-256'
                }
            },
            privateKey,
            new TextEncoder().encode(`${base64Header}.${base64Payload}`)
        ));

        return `${base64Header}.${base64Payload}.${base64Signature}`;
    }

    /**
     * Post a new account.
     * @param {string} nonce
     * @param {crypto.webcrypto.JsonWebKey} jwk
     * @param {LetsEncryptDirectory} directory
     * @param {LetsEncryptPostNewAccountOptions} options
     * @returns {LetsEncryptNewAccount}
     */
    public async postNewAccount(
        nonce: string,
        jwk: crypto.webcrypto.JsonWebKey,
        directory: LetsEncryptDirectory,
        options: LetsEncryptPostNewAccountOptions = {
            onlyReturnExisting: false
        }
    ): Promise<LetsEncryptNewAccount> {
        const pubJwk = {
            crv: jwk.crv,
            kty: jwk.kty,
            x: jwk.x,
            y: jwk.y
        };

        const header = {
            nonce: nonce,
            url: directory.newAccount,
            alg: 'ES256',
            jwk: pubJwk
        };

        const payload = {
            termsOfServiceAgreed: true,
            onlyReturnExisting: options.onlyReturnExisting
        };

        const jwt = await this._jwtFromJson(jwk, header, payload);

        const res = await fetch(directory.newAccount, {
            mode: 'cors',
            method: 'POST',
            headers: {'Content-Type': 'application/jose+json'},
            body: JSON.stringify(this._parseJwt(jwt))
        });

        this._throwIfErrored(await res.json());

        return {
            nonce: res.headers.get('Replay-Nonce')!,
            accountUrl: res.headers.get('location')!
        };
    }

    public async postNewOrder(
        nonce: string,
        jwk: crypto.webcrypto.JsonWebKey,
        directory: LetsEncryptDirectory,
        accountUrl: string,
        domainName: string
    ): Promise<LetsEncryptNewOrder> {
        const header = {
            alg: 'ES256',
            kid: accountUrl,
            nonce: nonce,
            url: directory.newOrder
        };

        const payload = {
            identifiers: [{
                type: 'dns',
                value: domainName
            }]
        };

        const jwt = await this._jwtFromJson(jwk, header, payload);

        const res = await fetch(directory.newOrder, {
            method: 'POST',
            headers: {'Content-Type': 'application/jose+json'},
            body: JSON.stringify(this._parseJwt(jwt))
        });

        const order = await res.json();

        this._throwIfErrored(order);

        return {
            nonce: res.headers.get('Replay-Nonce')!,
            order: order
        };
    }

    public async getOrderAuthorization(
        nonce: string,
        jwk: crypto.webcrypto.JsonWebKey,
        accountUrl: string,
        order: any
    ): Promise<LetsEncryptOrderAuthorization> {
        const header = {
            alg: 'ES256',
            kid: accountUrl,
            nonce: nonce,
            url: order.authorizations[0]
        };

        const payload = '';

        const jwt = await this._jwtFromJson(jwk, header, payload);

        const res = await fetch(order.authorizations[0], {
            method: 'POST',
            headers: {'Content-Type': 'application/jose+json'},
            body: JSON.stringify(this._parseJwt(jwt))
        });

        const authorization = await res.json();

        this._throwIfErrored(authorization);

        return {
            nonce: res.headers.get('Replay-Nonce')!,
            authorization: authorization
        };
    }

    private async _thumbprint(jwk: crypto.webcrypto.JsonWebKey): Promise<string> {
        const pubJwk = {
            crv: jwk.crv,
            kty: jwk.kty,
            x: jwk.x,
            y: jwk.y
        };

        const hash = await crypto.subtle.digest(
            {name: 'SHA-256'},
            new TextEncoder().encode(JSON.stringify(pubJwk))
        );

        return this._arrayBufferToBase64Url(hash);
    }

    /**
     * calculate the record text
     * @param {string} token
     * @param {crypto.webcrypto.JsonWebKey} jwk
     * @private
     * @returns {string}
     */
    private async _calculateRecordText(
        token: string,
        jwk: crypto.webcrypto.JsonWebKey
    ): Promise<string> {
        const keyAuthorization = `${token}.${await this._thumbprint(jwk)}`;

        const hash = await crypto.subtle.digest(
            {name: 'SHA-256'},
            new TextEncoder().encode(keyAuthorization)
        );

        return this._arrayBufferToBase64Url(hash);
    }

    private async _postOrderChallenge(
        nonce: string,
        jwk: crypto.webcrypto.JsonWebKey,
        accountUrl: string,
        challenge: any
    ): Promise<LetsEncryptOrderChallenge> {
        const header = {
            alg: 'ES256',
            kid: accountUrl,
            nonce: nonce,
            url: challenge.url
        };

        const payload = {};

        const jwt = await this._jwtFromJson(jwk, header, payload);

        const res = await fetch(challenge.url, {
            method: 'POST',
            headers: {'Content-Type': 'application/jose+json'},
            body: JSON.stringify(this._parseJwt(jwt))
        });

        this._throwIfErrored(await res.json());

        return {
            nonce: res.headers.get('Replay-Nonce')!,
            authUrl: res.headers.get('location')!
        };
    }

    private async _generateCsr(domainName: string): Promise<LetsEncryptGenerateCsr|null> {
        const keys = forge.pki.rsa.generateKeyPair(this._keySize);

        const csr = forge.pki.createCertificationRequest();

        csr.publicKey = keys.publicKey;
        csr.setSubject([{
            name: 'commonName',
            value: domainName
        }]);

        csr.setAttributes([{
            name: 'extensionRequest',
            extensions: [{
                name: 'subjectAltName',
                altNames: [{
                    // 2 is DNS types
                    type: 2,
                    value: domainName
                }]
            }]
        }]);

        csr.sign(keys.privateKey, forge.md.sha256.create());

        const derBase64Url = forge.pki.certificationRequestToPem(csr)
        .split(/\r\n|\r|\n/u)
        .slice(1, -2)
        .join('')
        .replace(/\+/gu, '-')
        .replace(/\//gu, '_')
        .replace(/[=]+$/gu, '');

        return {
            csr: derBase64Url,
            pkcs8Key: forge.pki.privateKeyInfoToPem(
                forge.pki.wrapRsaPrivateKey(
                    forge.pki.privateKeyToAsn1(keys.privateKey)
                )
            )
        };
    }

    private async _postOrderFinalize(
        nonce: string,
        jwk: crypto.webcrypto.JsonWebKey,
        accountUrl: string,
        order: any,
        csr: string
    ): Promise<LetsEncryptPostOrderFinalize> {
        const header = {
            alg: 'ES256',
            kid: accountUrl,
            nonce: nonce,
            url: order.finalize
        };

        const payload = {csr: csr};
        const jwt = await this._jwtFromJson(jwk, header, payload);

        const res = await fetch(order.finalize, {
            method: 'POST',
            headers: {'Content-Type': 'application/jose+json'},
            body: JSON.stringify(this._parseJwt(jwt))
        });

        /**
         * TODO
         * urn:ietf:params:acme:error:orderNotReady
         *
         * {
         *   "type": "urn:ietf:params:acme:error:orderNotReady",
         *   "detail": "Order's status (\"pending\") is not acceptable for finalization",
         *   "status": 403
         * }
         */
        const body = await res.json();

        this._throwIfErrored(body);

        return {
            nonce: res.headers.get('Replay-Nonce')!,
            orderUrl: res.headers.get('location')!,
            certUrl: body.certificate
        };
    }

    private async _getOrder(
        nonce: string,
        jwk: crypto.webcrypto.JsonWebKey,
        accountUrl: string,
        orderUrl: string
    ): Promise<LetsEncryptOrder> {
        const header = {
            alg: 'ES256',
            kid: accountUrl,
            nonce: nonce,
            url: orderUrl
        };

        const payload = '';
        const jwt = await this._jwtFromJson(jwk, header, payload);

        const res = await fetch(orderUrl, {
            // A POST-AS-GET request
            method: 'POST',
            headers: { 'Content-Type': 'application/jose+json' },
            body: JSON.stringify(this._parseJwt(jwt))
        });

        const order = await res.json();

        return {
            nonce: res.headers.get('Replay-Nonce')!,
            status: order.status,
            certUrl: order.certificate
        };
    }

    private _parsePemCertChain(pemCertChain: string): string[] {
        const parsed: string[] = [];
        let startIndex = pemCertChain.indexOf('-----BEGIN CERTIFICATE-----');
        let endIndex;

        while (startIndex !== -1) {
            endIndex = pemCertChain.indexOf('-----END CERTIFICATE-----', startIndex) + '-----END CERTIFICATE-----'.length;
            parsed.push(pemCertChain.slice(startIndex, endIndex));
            startIndex = pemCertChain.indexOf('-----BEGIN CERTIFICATE-----', endIndex);
        }

        return parsed;
    }

    private async _getPemCertChain(
        nonce: string,
        jwk: crypto.webcrypto.JsonWebKey,
        accountUrl: string,
        certUrl: string
    ): Promise<LetsEncryptPemCertChain> {
        const header = {
            alg: 'ES256',
            kid: accountUrl,
            nonce: nonce,
            url: certUrl
        };

        const payload = '';

        const jwt = await this._jwtFromJson(jwk, header, payload);

        const res = await fetch(certUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/jose+json',
                'Accept': 'application/pem-certificate-chain'
            },
            body: JSON.stringify(this._parseJwt(jwt))
        });

        if (res.status >= 400) {
            throw new Error(res.statusText);
        }

        const pemCertChain = this._parsePemCertChain(await res.text());

        return {
            nonce: res.headers.get('Replay-Nonce')!,
            pemCertChain: pemCertChain
        };
    }

    /**
     * Request a DNS challenge
     * @param {string} domainName
     * @returns {LetsEncryptDnsChallenge|null}
     */
    public async requestDnsChallenge(domainName: string): Promise<LetsEncryptDnsChallenge|null> {
        let nonce = await this._getNewNonce(this._directory);

        if (nonce) {
            if (this._jwk && this._accountUrl) {
                const order = await this.postNewOrder(nonce, this._jwk, this._directory, this._accountUrl, domainName);

                nonce = order.nonce;

                const orderAuth = await this.getOrderAuthorization(nonce, this._jwk, this._accountUrl, order.order);

                const challenge = orderAuth.authorization.challenges.filter((c: any) => c.type === 'dns-01')[0];

                return {
                    recordName: '_acme-challenge',
                    recordText: await this._calculateRecordText(challenge.token, this._jwk),
                    order: order.order
                };
            }
        }

        return null;
    }

    public async submitDnsChallengeAndFinalize(order: any): Promise<LetsEncryptDnsChallengeAndFinalize|null> {
        let nonce = await this._getNewNonce(this._directory);

        if (nonce) {
            if (this._jwk && this._accountUrl) {
                const orderAuth = await this.getOrderAuthorization(nonce, this._jwk, this._accountUrl, order);

                nonce = orderAuth.nonce;

                const challenge = orderAuth.authorization.challenges.filter((c: any) => c.type === 'dns-01')[0];

                const postOrder = await this._postOrderChallenge(nonce, this._jwk, this._accountUrl, challenge);

                nonce = postOrder.nonce;

                const domainName = orderAuth.authorization.identifier.value;

                const gCsr = await this._generateCsr(domainName);

                if (gCsr) {
                    const pOf = await this._postOrderFinalize(nonce, this._jwk, this._accountUrl, order, gCsr.csr);

                    nonce = pOf.nonce;

                    let certUrl = pOf.certUrl;

                    while (!certUrl) {
                        // eslint-disable-next-line no-await-in-loop
                        await new Promise(r => {
                            setTimeout(r, Client.POLL_DELAY);
                        });

                        // eslint-disable-next-line no-await-in-loop
                        ({ nonce, certUrl } = await this._getOrder(nonce, this._jwk, this._accountUrl, pOf.orderUrl));
                    }

                    const pC = await this._getPemCertChain(nonce, this._jwk, this._accountUrl, certUrl);

                    return {
                        pemCertChain: pC.pemCertChain,
                        pkcs8Key: gCsr.pkcs8Key
                    };
                }
            }
        }

        return null;
    }

}