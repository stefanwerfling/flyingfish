import {SchemaErrors} from 'vts';

/**
 * SchemaError
 */
export class SchemaError extends Error {

    /**
     * constructor
     * @param errors
     */
    public constructor(errors: SchemaErrors) {
        super(errors.join(', '));
    }

}