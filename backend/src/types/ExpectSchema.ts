import {Schema, SchemaErrors} from 'vts';

interface CustomMatcherResult {
    pass: boolean;
    message: () => string;
}

export const SchemaMatchers = {
    toValidateSchema: (received: any, schema: Schema<any>): CustomMatcherResult | Promise<CustomMatcherResult> => {
        const errors: SchemaErrors = [];

        if (schema.validate(received, errors)) {
            return {
                message: () => 'expected object schema is not validate',
                pass: false,
            };
        }

        return {
            message: () => 'expected object schema is validate',
            pass: true,
        };
    }
};

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {

        interface Matchers<R> {
            toValidateSchema(schema: Schema<any>): R;
        }
    }
}

export {};