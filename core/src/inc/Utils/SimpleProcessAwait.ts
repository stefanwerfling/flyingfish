import {ChildProcessWithoutNullStreams} from 'child_process';
import {Logger} from '../Logger/Logger.js';

/**
 * SimpleProcessAwait
 */
export class SimpleProcessAwait {

    /**
     * process
     * @param process
     * @param stderrLevel log level for stderr output - tools like openssl write
     * progress/status to stderr, which is not an error per se
     */
    public static async process(process: ChildProcessWithoutNullStreams, stderrLevel: string = 'error'): Promise<void> {
        process.stdout!.on('data', (buf) => {
            Logger.getLogger().info(buf.toString());
        });

        process.stderr!.on('data', (buf) => {
            Logger.getLogger().log(stderrLevel, buf.toString());
        });

        await new Promise((resolve) => {
            process.on('close', resolve);
        });
    }

}