import {StatusCodes} from '../Status/StatusCodes';

/**
 * DefaultReturn
 */
export type DefaultReturn = {
    statusCode: number|StatusCodes;
    msg?: string;
};