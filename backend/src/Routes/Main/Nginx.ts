import {Router} from 'express';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn.js';
import {DefaultRoute} from '../../inc/Routes/DefaultRoute.js';
import {StatusCodes} from '../../inc/Routes/StatusCodes.js';
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