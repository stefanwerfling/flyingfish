import {DefaultRoute} from 'flyingfish_core';
import {Router} from 'express';
import {List} from './DynDnsServer/List.js';

/**
 * DynDnsServer
 */
export class DynDnsServer extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._get(
            '/json/dyndnsserver/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await List.getList());
                }
            }
        );

        return super.getExpressRouter();
    }

}