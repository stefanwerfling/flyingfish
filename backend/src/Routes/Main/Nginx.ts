import {Router} from 'express';
import {DefaultRoute} from 'flyingfish_core';
import {Reload} from './Nginx/Reload.js';

/**
 * Nginx
 */
export class Nginx extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._get(
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