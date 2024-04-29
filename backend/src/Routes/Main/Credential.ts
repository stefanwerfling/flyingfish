import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {List} from './Credential/List.js';

export class Credential extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._get(
            '/json/credential/list',
            async(
                req,
                res
            ) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(List.getCredentials());
                }
            }
        );

        return super.getExpressRouter();
    }

}