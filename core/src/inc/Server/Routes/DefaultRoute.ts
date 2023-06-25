import {Request, Response, Router} from 'express';
import {DefaultReturn, RequestData, SchemaRequestData, StatusCodes} from 'flyingfish_schemas';
import {Schema, SchemaErrors} from 'vts';
import {Logger} from '../../Logger/Logger.js';
import {Session} from '../Session.js';

/**
 * DefaultRouteHandlerGet
 */
export type DefaultRouteHandlerGet = (request: Request, response: Response) => void;

/**
 * DefaultRouteHandlerPost
 */
export type DefaultRouteHandlerPost = (request: Request, response: Response) => void;

/**
 * DefaultRoute
 */
export class DefaultRoute {

    /**
     * routes
     * @protected
     */
    protected _routes: Router;

    /**
     * constructor
     */
    public constructor() {
        this._routes = Router();
    }

    /**
     * isSchemaValidate
     * @param schema
     * @param data
     * @param res
     */
    public isSchemaValidate<T>(
        schema: Schema<T>,
        data: unknown,
        res: Response
    ): data is T {
        const errors: SchemaErrors = [];

        if (!schema.validate(data, errors)) {
            res.status(200).json({
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: errors.join(', ')
            } as DefaultReturn);

            return false;
        }

        return true;
    }

    /**
     * isUserLogin
     * @param req
     * @param res
     * @param sendAutoResoonse
     */
    public isUserLogin(
        req: unknown,
        res: Response,
        sendAutoResoonse: boolean = true
    ): req is RequestData {
        if (SchemaRequestData.validate(req, [])) {
            if (Session.isUserLogin(req.session)) {
                return true;
            }
        }

        if (sendAutoResoonse) {
            res.status(200).json({
                statusCode: StatusCodes.UNAUTHORIZED
            } as DefaultReturn);
        }

        return false;
    }

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        return this._routes;
    }

    /**
     * _get
     * @param path
     * @param handler
     * @protected
     */
    protected _get(path: string, handler: DefaultRouteHandlerGet): void {
        try {
            this._routes.get(path, async(req, res) => {
                try {
                    handler(req, res);
                } catch (ie) {
                    Logger.getLogger().error(`DefaultRoute::_get: Exception intern, path can not call: ${path}`);
                }
            });
        } catch (e) {
            Logger.getLogger().error(`DefaultRoute::_get: Exception extern, path can not call: ${path}`);
        }
    }

    /**
     * _post
     * @param path
     * @param handler
     * @protected
     */
    protected _post(path: string, handler: DefaultRouteHandlerPost): void {
        try {
            this._routes.post(path, async(req, res) => {
                try {
                    handler(req, res);
                } catch (ie) {
                    Logger.getLogger().error(`DefaultRoute::_post: Exception intern, path can not call: ${path}`);
                }
            });
        } catch (e) {
            Logger.getLogger().error(`DefaultRoute::_post: Exception extern, path can not call: ${path}`);
        }
    }

}