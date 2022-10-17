import {StatusCodes} from './StatusCodes';

/**
 * DefaultReturn
 */
export type DefaultReturn = {
    statusCode: number|StatusCodes;
    msg?: string;
};