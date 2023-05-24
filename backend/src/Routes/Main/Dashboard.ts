import {Router} from 'express';
import {DefaultRoute, Session, StatusCodes} from 'flyingfish_core';
import {DashboardInfoResponse, Info} from './Dashboard/Info.js';

/**
 * Dashboard
 */
export class Dashboard extends DefaultRoute {

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
            '/json/dashboard/info',
            async(req, res) => {
                if (Session.isUserLogin(req.session)) {
                    res.status(200).json(await Info.getInfo());
                } else {
                    res.status(200).json({
                        public_ip: null,
                        public_ip_blacklisted: false,
                        host: null,
                        ipblocks: [],
                        ipblock_count: 0,
                        statusCode: StatusCodes.UNAUTHORIZED
                    } as DashboardInfoResponse);
                }
            }
        );

        return super.getExpressRouter();
    }

}