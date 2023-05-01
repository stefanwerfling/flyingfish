import {Router} from 'express';
import {DefaultReturn, DefaultRoute, StatusCodes} from 'flyingfish_core';
import {NginxService} from '../../inc/Service/NginxService.js';

/**
 * NginxReloadResponse
 */
export type NginxReloadResponse = DefaultReturn;

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
     * reload
     */
    public async reload(): Promise<NginxReloadResponse> {
        await NginxService.getInstance().reload();

        return {
            statusCode: StatusCodes.OK
        };
    }

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/nginx/reload',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.reload());
                }
            }
        );

        return super.getExpressRouter();
    }

}