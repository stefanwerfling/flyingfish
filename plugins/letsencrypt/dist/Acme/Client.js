import { JwkHelper } from 'flyingfish_core';
import * as crypto from 'crypto';
import forge from 'node-forge';
export class Client {
    static POLL_DELAY = 5000;
    _endpoint = 'https://acme-v02.api.letsencrypt.org';
    _keySize = 2048;
    _directory;
    _jwk;
    _accountUrl;
    constructor(options) {
        if (options) {
            if (options.keysize) {
                this._keySize = options.keysize;
            }
        }
    }
    async init(jwk) {
        this._directory = await (await fetch(`${this._endpoint}/directory`)).json();
        let nonce = await this._getNewNonce(this._directory);
        if (nonce) {
            if (jwk) {
                this._jwk = jwk;
                const newAccount = await this.postNewAccount(nonce, this._jwk, this._directory, { onlyReturnExisting: true });
                nonce = newAccount.nonce;
                this._accountUrl = newAccount.accountUrl;
            }
            else {
                this._jwk = await this._generateJwk();
                const newAccount = await this.postNewAccount(nonce, this._jwk, this._directory);
                nonce = newAccount.nonce;
                this._accountUrl = newAccount.accountUrl;
            }
            return true;
        }
        return false;
    }
    getJwk() {
        return this._jwk;
    }
    _throwIfErrored(resJson) {
        if (resJson.status && typeof resJson.status === 'number' && resJson.status >= 400) {
            throw new Error(JSON.stringify(resJson));
        }
    }
    async _generateJwk() {
        return await JwkHelper.generateJwk();
    }
    async _getNewNonce(directory) {
        const res = await fetch(directory.newNonce, {
            method: 'HEAD'
        });
        return res.headers.get('Replay-Nonce');
    }
    _parseJwt(jwt) {
        const jwtParts = jwt.split('.');
        return {
            protected: jwtParts[0],
            payload: jwtParts[1],
            signature: jwtParts[2]
        };
    }
    _jsonToBase64Url(json) {
        return btoa(JSON.stringify(json))
            .replace(/\+/gu, '-')
            .replace(/\//gu, '_')
            .replace(/[=]+$/gu, '');
    }
    _arrayBufferToBase64Url(buf) {
        return btoa(Array.prototype.map.call(new Uint8Array(buf), (ch) => String.fromCharCode(ch)).join(''))
            .replace(/\+/gu, '-')
            .replace(/\//gu, '_')
            .replace(/[=]+$/gu, '');
    }
    async _jwtFromJson(jwk, header, payload) {
        const privateKey = await crypto.subtle.importKey('jwk', jwk, {
            name: 'ECDSA',
            namedCurve: 'P-256'
        }, false, ['sign']);
        const base64Header = this._jsonToBase64Url(header);
        const base64Payload = payload === '' ? '' : this._jsonToBase64Url(payload);
        const base64Signature = this._arrayBufferToBase64Url(await crypto.subtle.sign({
            name: 'ECDSA',
            hash: {
                name: 'SHA-256'
            }
        }, privateKey, new TextEncoder().encode(`${base64Header}.${base64Payload}`)));
        return `${base64Header}.${base64Payload}.${base64Signature}`;
    }
    async postNewAccount(nonce, jwk, directory, options = {
        onlyReturnExisting: false
    }) {
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
            headers: { 'Content-Type': 'application/jose+json' },
            body: JSON.stringify(this._parseJwt(jwt))
        });
        this._throwIfErrored(await res.json());
        return {
            nonce: res.headers.get('Replay-Nonce'),
            accountUrl: res.headers.get('location')
        };
    }
    async postNewOrder(nonce, jwk, directory, accountUrl, domainName) {
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
            headers: { 'Content-Type': 'application/jose+json' },
            body: JSON.stringify(this._parseJwt(jwt))
        });
        const order = await res.json();
        this._throwIfErrored(order);
        return {
            nonce: res.headers.get('Replay-Nonce'),
            order: order
        };
    }
    async getOrderAuthorization(nonce, jwk, accountUrl, order) {
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
            headers: { 'Content-Type': 'application/jose+json' },
            body: JSON.stringify(this._parseJwt(jwt))
        });
        const authorization = await res.json();
        this._throwIfErrored(authorization);
        return {
            nonce: res.headers.get('Replay-Nonce'),
            authorization: authorization
        };
    }
    async _thumbprint(jwk) {
        const pubJwk = {
            crv: jwk.crv,
            kty: jwk.kty,
            x: jwk.x,
            y: jwk.y
        };
        const hash = await crypto.subtle.digest({ name: 'SHA-256' }, new TextEncoder().encode(JSON.stringify(pubJwk)));
        return this._arrayBufferToBase64Url(hash);
    }
    async _calculateRecordText(token, jwk) {
        const keyAuthorization = `${token}.${await this._thumbprint(jwk)}`;
        const hash = await crypto.subtle.digest({ name: 'SHA-256' }, new TextEncoder().encode(keyAuthorization));
        return this._arrayBufferToBase64Url(hash);
    }
    async _postOrderChallenge(nonce, jwk, accountUrl, challenge) {
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
            headers: { 'Content-Type': 'application/jose+json' },
            body: JSON.stringify(this._parseJwt(jwt))
        });
        this._throwIfErrored(await res.json());
        return {
            nonce: res.headers.get('Replay-Nonce'),
            authUrl: res.headers.get('location')
        };
    }
    async _generateCsr(domainName) {
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
            pkcs8Key: forge.pki.privateKeyInfoToPem(forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(keys.privateKey)))
        };
    }
    async _postOrderFinalize(nonce, jwk, accountUrl, order, csr) {
        const header = {
            alg: 'ES256',
            kid: accountUrl,
            nonce: nonce,
            url: order.finalize
        };
        const payload = { csr: csr };
        const jwt = await this._jwtFromJson(jwk, header, payload);
        const res = await fetch(order.finalize, {
            method: 'POST',
            headers: { 'Content-Type': 'application/jose+json' },
            body: JSON.stringify(this._parseJwt(jwt))
        });
        const body = await res.json();
        this._throwIfErrored(body);
        return {
            nonce: res.headers.get('Replay-Nonce'),
            orderUrl: res.headers.get('location'),
            certUrl: body.certificate
        };
    }
    async _getOrder(nonce, jwk, accountUrl, orderUrl) {
        const header = {
            alg: 'ES256',
            kid: accountUrl,
            nonce: nonce,
            url: orderUrl
        };
        const payload = '';
        const jwt = await this._jwtFromJson(jwk, header, payload);
        const res = await fetch(orderUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/jose+json' },
            body: JSON.stringify(this._parseJwt(jwt))
        });
        const order = await res.json();
        return {
            nonce: res.headers.get('Replay-Nonce'),
            status: order.status,
            certUrl: order.certificate
        };
    }
    _parsePemCertChain(pemCertChain) {
        const parsed = [];
        let startIndex = pemCertChain.indexOf('-----BEGIN CERTIFICATE-----');
        let endIndex;
        while (startIndex !== -1) {
            endIndex = pemCertChain.indexOf('-----END CERTIFICATE-----', startIndex) + '-----END CERTIFICATE-----'.length;
            parsed.push(pemCertChain.slice(startIndex, endIndex));
            startIndex = pemCertChain.indexOf('-----BEGIN CERTIFICATE-----', endIndex);
        }
        return parsed;
    }
    async _getPemCertChain(nonce, jwk, accountUrl, certUrl) {
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
            nonce: res.headers.get('Replay-Nonce'),
            pemCertChain: pemCertChain
        };
    }
    async requestDnsChallenge(domainName) {
        let nonce = await this._getNewNonce(this._directory);
        if (nonce) {
            if (this._jwk && this._accountUrl) {
                const order = await this.postNewOrder(nonce, this._jwk, this._directory, this._accountUrl, domainName);
                nonce = order.nonce;
                const orderAuth = await this.getOrderAuthorization(nonce, this._jwk, this._accountUrl, order.order);
                const challenge = orderAuth.authorization.challenges.filter((c) => c.type === 'dns-01')[0];
                return {
                    recordName: '_acme-challenge',
                    recordText: await this._calculateRecordText(challenge.token, this._jwk),
                    order: order.order
                };
            }
        }
        return null;
    }
    async submitDnsChallengeAndFinalize(order) {
        let nonce = await this._getNewNonce(this._directory);
        if (nonce) {
            if (this._jwk && this._accountUrl) {
                const orderAuth = await this.getOrderAuthorization(nonce, this._jwk, this._accountUrl, order);
                nonce = orderAuth.nonce;
                const challenge = orderAuth.authorization.challenges.filter((c) => c.type === 'dns-01')[0];
                const postOrder = await this._postOrderChallenge(nonce, this._jwk, this._accountUrl, challenge);
                nonce = postOrder.nonce;
                const domainName = orderAuth.authorization.identifier.value;
                const gCsr = await this._generateCsr(domainName);
                if (gCsr) {
                    const pOf = await this._postOrderFinalize(nonce, this._jwk, this._accountUrl, order, gCsr.csr);
                    nonce = pOf.nonce;
                    let certUrl = pOf.certUrl;
                    while (!certUrl) {
                        await new Promise(r => {
                            setTimeout(r, Client.POLL_DELAY);
                        });
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
//# sourceMappingURL=Client.js.map