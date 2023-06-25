import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {List} from './Ssh/List.js';

/**
 * Ssh
 */
export class Ssh extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._get(
            '/json/ssh/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await List.getList());
                }
            }
        );

        return super.getExpressRouter();
    }

}