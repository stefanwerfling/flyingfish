import {Response, Router} from 'express';
import {DefaultReturn, RequestData, SchemaRequestData, StatusCodes} from 'flyingfish_schemas';
import {Schema, SchemaErrors} from 'vts';
import {Session} from '../Session.js';

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

}