import {DefaultRoute, DnsRecordBase, SslCertCreateGlobal} from 'flyingfish_core';
import {Router} from 'express';
import {HookAuthReq, SchemaHookAuthReq} from '../../Schema/HookAuth.js';

/**
 * LetsEncrypt DNS 01 Route Auth
 */
export class Auth extends DefaultRoute {

    /**
     * SslCertcreate global
     * @protected
     */
    protected _global: SslCertCreateGlobal;

    /**
     * constructor
     * @param {SslCertCreateGlobal} global
     */
    public constructor(global: SslCertCreateGlobal) {
        super();

        this._global = global;
    }

    protected async _requestAuth(req: HookAuthReq): Promise<boolean> {
        if (this._global.dnsServer) {
            let domain = req.domain;

            if (!domain.startsWith('_acme-challenge.')) {
                domain = `_acme-challenge.${domain}`;
            }

            const record: DnsRecordBase = {
                // TXT
                type: 0x10,
                // IN
                class: 0x01,
                name: domain,
                ttl: 1,
                data: req.value
            };

            await this._global.dnsServer.addTempDomain(domain, [record]);

            return true;
        }

        return false;
    }

    /**
     * getExpressRouter
     * @returns {Router}
     */
    public getExpressRouter(): Router {
        this._post(
            '/letsencrypt/auth',
            async(req, res) => {
                if (this.isSchemaValidate(SchemaHookAuthReq, req.body, res)) {
                    if (await this._requestAuth(req.body)) {
                        res.sendStatus(200);
                    } else {
                        res.sendStatus(500);
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}