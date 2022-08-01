import {ChildProcessWithoutNullStreams} from 'child_process';
import {Logger} from '../Logger/Logger';

/**
 * SimpleProcessAwait
 */
export class SimpleProcessAwait {

    /**
     * process
     * @param process
     */
    public static async process(process: ChildProcessWithoutNullStreams): Promise<void> {
        process.stdout!.on('data', (buf) => {
            Logger.getLogger().info(buf.toString());
        });

        process.stderr!.on('data', (buf) => {
            Logger.getLogger().error(buf.toString());
        });

        await new Promise((resolve) => {
            process.on('close', resolve);
        });
    }

}