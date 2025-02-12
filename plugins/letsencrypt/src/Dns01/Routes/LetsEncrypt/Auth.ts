import {DefaultRoute, SslCertCreateGlobal} from 'flyingfish_core';
import {Router} from 'express';

/**
 * LetsEncrypt DNS 01 Route Auth
 */
export class Auth extends DefaultRoute {

    /**
     * SslCertcreate global
     * @protected
     */
    protected _global: SslCertCreateGlobal;

    public constructor(global: SslCertCreateGlobal) {
        super();

        this._global = global;
    }

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        return super.getExpressRouter();
    }

}