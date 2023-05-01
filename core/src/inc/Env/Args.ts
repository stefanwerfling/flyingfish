import {Schema, SchemaErrors} from 'vts';

/**
 * Args
 */
export class Args {

    /**
     * get
     */
    public static get<T>(schema: Schema<T>): T {
        const args: { [key: string]: string | boolean; } = {};

        const processArgs = process.argv.slice(2, process.argv.length);

        processArgs.forEach((arg) => {
            if (arg.slice(0, 2) === '--') {
                const longArg = arg.split('=');
                const longArgFlag = longArg[0].slice(2, longArg[0].length);
                args[longArgFlag] = longArg.length > 1 ? longArg[1] : true;
            } else if (arg[0] === '-') {
                const flags = arg.slice(1, arg.length).split('');

                flags.forEach((flag) => {
                    args[flag] = true;
                });
            }
        });

        const errors: SchemaErrors = [];

        if (!schema.validate(args, errors)) {
            console.log('Config arguments error:');

            for (const error of errors) {
                console.log(`- ${error}`);
            }

            process.exit(1);
        }

        return args;
    }

}