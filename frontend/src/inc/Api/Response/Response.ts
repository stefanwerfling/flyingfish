import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';
import {Schema, SchemaErrors, Vts} from 'vts';
import {InternalError} from '../Error/InternalError';
import {SchemaError} from '../Error/SchemaError';
import {UnauthorizedError} from '../Error/UnauthorizedError';
import {UnknownResponse} from '../Error/UnknownResponse';

/**
 * Response
 */
export class Response {

    /**
     * isSchemaValidate
     * @param schema
     * @param data
     */
    public static isSchemaValidate<T>(
        schema: Schema<T>,
        data: unknown
    ): data is T & DefaultReturn {
        const errors: SchemaErrors = [];

        if (!schema.validate(data, errors)) {
            throw new SchemaError(errors);
        }

        return true;
    }

    /**
     * isResponse
     * @param schema
     * @param data
     */
    public static isResponse<T>(
        schema: Schema<T>,
        data: unknown
    ): data is T & DefaultReturn {
        if (Response.isSchemaValidate(schema, data)) {
            if (data && data.statusCode) {
                switch (data.statusCode) {
                    case StatusCodes.OK:
                        return true;

                    case StatusCodes.UNAUTHORIZED:
                        throw new UnauthorizedError();

                    case StatusCodes.INTERNAL_ERROR:
                        if (Vts.isUndefined(data.msg)) {
                            throw new InternalError('');
                        }

                        throw new InternalError(data.msg);
                }
            }

            throw new UnknownResponse();
        }

        return true;
    }

}