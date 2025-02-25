import {DefaultRoute, SslCertCreateGlobal} from 'flyingfish_core';
import {Router} from 'express';
import {HookCleanupReq, SchemaHookCleanupReq} from '../../Schema/HookCleanup.js';

/**
 * LetsEncrypt DNS 01 Route CleanUp
 */
export class CleanUp extends DefaultRoute {

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

    /**
     * Request clean up
     * @param {HookCleanupReq} req
     * @protected
     */
    protected async _requestCleanUp(req: HookCleanupReq): Promise<boolean> {
        if (this._global.dnsServer) {
            let domain = req.domain;

            if (!domain.startsWith('_acme-challenge.')) {
                domain = `_acme-challenge.${domain}`;
            }

            this._global.dnsServer.removeTempDomain(domain);

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
            '/letsencrypt/cleanup',
            async(req, res) => {
                if (this.isSchemaValidate(SchemaHookCleanupReq, req.body, res)) {
                    if (await this._requestCleanUp(req.body)) {
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