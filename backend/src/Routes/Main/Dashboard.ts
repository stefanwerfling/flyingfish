import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {DefaultHandlerReturn, HandlerResultType} from 'figtree-schemas';
import {
    DashboardInfoResponse,
    DefaultReturn,
    SchemaDashboardInfoResponse,
    SchemaDefaultReturn,
    StatusCodes
} from 'flyingfish_schemas';
import {isFlyingFishUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {HimHIP} from './Dashboard/HimHIP.js';
import {Info} from './Dashboard/Info.js';
import {PublicIPBlacklistCheck} from './Dashboard/PublicIPBlacklistCheck.js';
import {StreamRequests} from './Dashboard/StreamRequests.js';

/**
 * Dashboard
 *
 * All routes answer 200 whether or not the session is logged in and branch on
 * the login state inside the handler (unauthenticated callers get an
 * UNAUTHORIZED-tagged payload rather than a 401 gate), so they register with
 * checkUserLogin = false and use the isFlyingFishUserLogin predicate.
 */
export class Dashboard extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._get(
            '/json/dashboard/info',
            false,
            async(req): Promise<DashboardInfoResponse> => {
                if (isFlyingFishUserLogin(req)) {
                    return Info.getInfo();
                }

                return {
                    public_ip: null,
                    public_ip_blacklisted: false,
                    host: null,
                    ipblocks: [],
                    ipblock_count: 0,
                    statusCode: StatusCodes.UNAUTHORIZED
                };
            },
            {
                description: 'Read the dashboard info',
                responseBodySchema: SchemaDashboardInfoResponse
            }
        );

        // The success and unauthorized branches return different shapes, so the
        // handler sends the response itself and reports it as handled.
        this._get(
            '/json/dashboard/publicipblacklistcheck',
            false,
            async(req, res): Promise<DefaultHandlerReturn> => {
                if (isFlyingFishUserLogin(req)) {
                    res.status(200).json(await PublicIPBlacklistCheck.check());
                } else {
                    res.status(200).json({statusCode: StatusCodes.UNAUTHORIZED} as DefaultReturn);
                }

                return {type: HandlerResultType.handled};
            },
            {
                description: 'Check the public IP against the RBL blacklists'
            }
        );

        this._get(
            '/json/dashboard/streamrequests',
            false,
            async(req, res): Promise<DefaultHandlerReturn> => {
                if (isFlyingFishUserLogin(req)) {
                    res.status(200).json(await StreamRequests.getList());
                } else {
                    res.status(200).json({statusCode: StatusCodes.UNAUTHORIZED} as DefaultReturn);
                }

                return {type: HandlerResultType.handled};
            },
            {
                description: 'Read the stream request counters'
            }
        );

        this._get(
            '/json/dashboard/refrechhimhip',
            false,
            async(req): Promise<DefaultReturn> => {
                if (isFlyingFishUserLogin(req)) {
                    return HimHIP.refrechHimHIP();
                }

                return {statusCode: StatusCodes.UNAUTHORIZED};
            },
            {
                description: 'Request a HimHIP data refresh',
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}