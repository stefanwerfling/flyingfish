import {ExtractSchemaResultType, SchemaErrors, Vts} from 'vts';

/**
 * SchemaFlyingFishArgs
 */
export const SchemaFlyingFishArgs = Vts.object({
    envargs: Vts.optional(Vts.string()),
    secret: Vts.optional(Vts.string()),
    url_path: Vts.optional(Vts.string()),
    server_host: Vts.optional(Vts.string()),
    server_port: Vts.optional(Vts.string()),
    server_protocol: Vts.optional(Vts.string()),
});

export type FlyingFishArgs = ExtractSchemaResultType<typeof SchemaFlyingFishArgs>;

/**
 * Args
 */
export class Args {

    /**
     * get
     */
    public static get(): FlyingFishArgs {
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

        if (!SchemaFlyingFishArgs.validate(args, errors)) {
            console.log('Config arguments error:');

            for (const error of errors) {
                console.log(`- ${error}`);
            }

            process.exit(1);
        }

        return args;
    }

}