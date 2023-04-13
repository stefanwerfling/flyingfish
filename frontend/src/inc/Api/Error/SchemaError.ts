import {SchemaErrors} from 'vts';

/**
 * SchemaError
 */
export class SchemaError extends Error {

    /**
     * constructor
     * @param message
     */
    public constructor(errors: SchemaErrors) {
        super(errors.join(', '));
    }

}