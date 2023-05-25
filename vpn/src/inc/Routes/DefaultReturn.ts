import {StatusCodes} from './StatusCodes.js';

/**
 * DefaultReturn
 */
export type DefaultReturn = {
    statusCode: number|StatusCodes;
    msg?: string;
};