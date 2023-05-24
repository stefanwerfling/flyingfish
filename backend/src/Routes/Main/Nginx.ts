import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {Reload} from './Nginx/Reload.js';

/**
 * Nginx
 */
export class Nginx extends DefaultRoute {

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/nginx/reload',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await Reload.reload());
                }
            }
        );

        return super.getExpressRouter();
    }

}